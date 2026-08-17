import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUS_LABEL, type TaskStatus } from "@/lib/types";

export default async function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("tasks").select("*").eq("project_id", id).order("position"),
  ]);

  if (!project) notFound();

  return (
    <div>
      <Link href="/portal" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Tus proyectos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">{project.name}</h1>
      {project.description && <p className="mt-1 text-sm text-neutral-600">{project.description}</p>}

      <ul className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(tasks ?? []).map((t) => (
          <li key={t.id}>
            <Link
              href={`/portal/projects/${id}/tasks/${t.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
            >
              <span className={t.status === "done" ? "text-neutral-400 line-through" : "text-neutral-900"}>
                {t.name}
              </span>
              <span className="text-xs text-neutral-500">{TASK_STATUS_LABEL[t.status as TaskStatus]}</span>
            </Link>
          </li>
        ))}
        {(tasks ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-500">Sin novedades por ahora.</li>
        )}
      </ul>
    </div>
  );
}
