import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "@/app/actions/projects";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/types";

export default async function StaffProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*, clients(name)").eq("id", id).single(),
    supabase.from("tasks").select("*").eq("project_id", id).order("position"),
  ]);

  if (!project) notFound();

  const doneCount = (tasks ?? []).filter((t) => t.status === "done").length;
  const total = (tasks ?? []).length;

  return (
    <div>
      <p className="text-sm text-neutral-500">
        {(project.clients as unknown as { name: string } | null)?.name ?? "Sin cliente"}
      </p>
      <h1 className="text-2xl font-semibold text-neutral-900">{project.name}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {total > 0 ? `${doneCount}/${total} tareas completadas` : "Sin tareas todavía"}
      </p>

      <form action={createTask} className="mt-6 flex flex-wrap items-center gap-2">
        <input type="hidden" name="project_id" value={id} />
        <input
          name="name"
          required
          placeholder="Nueva tarea"
          className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <label className="flex items-center gap-1.5 text-sm text-neutral-600">
          <input type="checkbox" name="client_visible" defaultChecked />
          Visible para el cliente
        </label>
        <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Agregar tarea
        </button>
      </form>

      <ul className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(tasks ?? []).map((t) => (
          <li key={t.id}>
            <Link
              href={`/app/projects/${id}/tasks/${t.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
            >
              <div className="flex items-center gap-2">
                <span className={t.status === "done" ? "text-neutral-400 line-through" : "text-neutral-900"}>
                  {t.name}
                </span>
                {!t.client_visible && (
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase text-neutral-500">
                    Interno
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-500">
                {TASK_STATUS_LABEL[t.status as TaskStatus]}
              </span>
            </Link>
          </li>
        ))}
        {(tasks ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-500">Agregá la primera tarea de este proyecto.</li>
        )}
      </ul>
    </div>
  );
}
