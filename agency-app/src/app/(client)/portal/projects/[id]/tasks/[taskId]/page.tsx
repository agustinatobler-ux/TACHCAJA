import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addComment } from "@/app/actions/comments";
import { setApprovalStatus } from "@/app/actions/attachments";
import { ProofingImage } from "@/components/proofing-image";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/types";

const APPROVAL_LABEL: Record<string, string> = {
  pending: "Pendiente de tu aprobación",
  approved: "Aprobado",
  changes_requested: "Pediste cambios",
};

export default async function PortalTaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;
  const supabase = await createClient();

  const [{ data: task }, { data: comments }, { data: attachments }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", taskId).single(),
    supabase
      .from("comments")
      .select("*, profiles(full_name)")
      .eq("task_id", taskId)
      .order("created_at"),
    supabase
      .from("attachments")
      .select("*, proofing_annotations(*)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
  ]);

  if (!task) notFound();

  return (
    <div>
      <Link href={`/portal/projects/${projectId}`} className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Volver al proyecto
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">{task.name}</h1>
        <span className="text-xs text-neutral-500">{TASK_STATUS_LABEL[task.status as TaskStatus]}</span>
      </div>
      {task.description && <p className="mt-2 text-sm text-neutral-600">{task.description}</p>}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-700">Entregables</h2>
        <div className="mt-2 space-y-6">
          {(attachments ?? []).map((a) => {
            const isImage = a.file_type.startsWith("image/");
            const viewUrl = `/api/attachments/${a.id}/view`;
            return (
              <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <a href={viewUrl} target="_blank" className="text-sm font-medium text-neutral-900 hover:underline">
                    {a.file_name}
                  </a>
                  <span
                    className={
                      a.approval_status === "approved"
                        ? "text-xs font-medium text-emerald-600"
                        : a.approval_status === "changes_requested"
                          ? "text-xs font-medium text-amber-600"
                          : "text-xs text-neutral-500"
                    }
                  >
                    {APPROVAL_LABEL[a.approval_status]}
                  </span>
                </div>

                {isImage && (
                  <div className="mt-3">
                    <ProofingImage
                      attachmentId={a.id}
                      projectId={projectId}
                      src={viewUrl}
                      annotations={a.proofing_annotations ?? []}
                    />
                    <p className="mt-1 text-xs text-neutral-400">Hacé clic sobre la imagen para dejar una corrección puntual.</p>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <form action={setApprovalStatus}>
                    <input type="hidden" name="attachment_id" value={a.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="status" value="approved" />
                    <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                      Aprobar
                    </button>
                  </form>
                  <form action={setApprovalStatus}>
                    <input type="hidden" name="attachment_id" value={a.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <input type="hidden" name="status" value="changes_requested" />
                    <button className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">
                      Pedir cambios
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {(attachments ?? []).length === 0 && (
            <p className="text-sm text-neutral-500">Todavía no hay entregables para revisar.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-700">Comentarios</h2>
        <ul className="mt-2 space-y-3">
          {(comments ?? []).map((c) => (
            <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <p className="text-neutral-500">{(c.profiles as unknown as { full_name: string })?.full_name}</p>
              <p className="mt-1 text-neutral-800">{c.body}</p>
            </li>
          ))}
          {(comments ?? []).length === 0 && <p className="text-sm text-neutral-500">Sin comentarios todavía.</p>}
        </ul>
        <form action={addComment} className="mt-3 space-y-2">
          <input type="hidden" name="task_id" value={taskId} />
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="client_visible" value="on" />
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Escribir un comentario…"
            className="w-full rounded-md border border-neutral-300 p-2 text-sm outline-none focus:border-neutral-900"
          />
          <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
            Comentar
          </button>
        </form>
      </section>
    </div>
  );
}
