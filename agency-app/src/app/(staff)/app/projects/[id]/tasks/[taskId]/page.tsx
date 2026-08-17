import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateTaskStatus, toggleTaskVisibility } from "@/app/actions/projects";
import { addComment } from "@/app/actions/comments";
import { uploadDeliverable, setApprovalStatus } from "@/app/actions/attachments";
import { ProofingImage } from "@/components/proofing-image";
import { TASK_STATUS_LABEL } from "@/lib/types";

const APPROVAL_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  changes_requested: "Cambios pedidos",
};

export default async function StaffTaskPage({
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
      <Link href={`/app/projects/${projectId}`} className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Volver al proyecto
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">{task.name}</h1>
        <div className="flex items-center gap-3">
          <form action={updateTaskStatus} className="flex items-center gap-2">
            <input type="hidden" name="task_id" value={taskId} />
            <input type="hidden" name="project_id" value={projectId} />
            <select
              name="status"
              defaultValue={task.status}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm hover:bg-neutral-100">
              Guardar
            </button>
          </form>
          <form action={toggleTaskVisibility} className="flex items-center gap-2">
            <input type="hidden" name="task_id" value={taskId} />
            <input type="hidden" name="project_id" value={projectId} />
            <label className="flex items-center gap-1.5 text-sm text-neutral-600">
              <input type="checkbox" name="client_visible" defaultChecked={task.client_visible} />
              Visible para el cliente
            </label>
            <button className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm hover:bg-neutral-100">
              Guardar
            </button>
          </form>
        </div>
      </div>

      {task.description && <p className="mt-2 text-sm text-neutral-600">{task.description}</p>}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-700">Entregables</h2>
        <form action={uploadDeliverable} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="task_id" value={taskId} />
          <input type="hidden" name="project_id" value={projectId} />
          <input type="file" name="file" required className="text-sm" />
          <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
            Subir
          </button>
        </form>

        <div className="mt-4 space-y-6">
          {(attachments ?? []).map((a) => {
            const isImage = a.file_type.startsWith("image/");
            const viewUrl = `/api/attachments/${a.id}/view`;
            return (
              <div key={a.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <a href={viewUrl} target="_blank" className="text-sm font-medium text-neutral-900 hover:underline">
                    {a.file_name}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">{APPROVAL_LABEL[a.approval_status]}</span>
                    <form action={setApprovalStatus}>
                      <input type="hidden" name="attachment_id" value={a.id} />
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="status" value="pending" />
                      <button className="text-xs text-neutral-400 hover:text-neutral-700">reset</button>
                    </form>
                  </div>
                </div>
                {isImage && (
                  <div className="mt-3">
                    <ProofingImage
                      attachmentId={a.id}
                      projectId={projectId}
                      src={viewUrl}
                      annotations={a.proofing_annotations ?? []}
                    />
                  </div>
                )}
                {(a.proofing_annotations ?? []).length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-neutral-600">
                    {a.proofing_annotations.map((note: { id: string; body: string }) => (
                      <li key={note.id}>• {note.body}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {(attachments ?? []).length === 0 && (
            <p className="text-sm text-neutral-500">Sin entregables subidos todavía.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-700">Comentarios</h2>
        <ul className="mt-2 space-y-3">
          {(comments ?? []).map((c) => (
            <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <p className="text-neutral-500">
                {(c.profiles as unknown as { full_name: string })?.full_name}
                {c.client_visible && (
                  <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] uppercase text-emerald-700">
                    Visible al cliente
                  </span>
                )}
              </p>
              <p className="mt-1 text-neutral-800">{c.body}</p>
            </li>
          ))}
        </ul>
        <form action={addComment} className="mt-3 space-y-2">
          <input type="hidden" name="task_id" value={taskId} />
          <input type="hidden" name="project_id" value={projectId} />
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Escribir un comentario…"
            className="w-full rounded-md border border-neutral-300 p-2 text-sm outline-none focus:border-neutral-900"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm text-neutral-600">
              <input type="checkbox" name="client_visible" />
              Visible para el cliente
            </label>
            <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
              Comentar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
