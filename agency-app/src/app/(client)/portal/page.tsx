import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/lib/types";

export default async function PortalHomePage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*, tasks(status)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Tus proyectos</h1>
      <div className="mt-6 space-y-4">
        {(projects ?? []).map((p) => {
          const tasks = (p.tasks as { status: string }[]) ?? [];
          const done = tasks.filter((t) => t.status === "done").length;
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
          return (
            <Link
              key={p.id}
              href={`/portal/projects/${p.id}`}
              className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-900">{p.name}</p>
                <span className="text-xs text-neutral-500">{PROJECT_STATUS_LABEL[p.status as ProjectStatus]}</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {tasks.length ? `${done}/${tasks.length} tareas completadas (${pct}%)` : "Sin tareas todavía"}
              </p>
            </Link>
          );
        })}
        {(projects ?? []).length === 0 && (
          <p className="text-sm text-neutral-500">Todavía no tenés proyectos visibles acá.</p>
        )}
      </div>
    </div>
  );
}
