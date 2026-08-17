import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "@/app/actions/projects";
import { PROJECT_STATUS_LABEL } from "@/lib/types";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Proyectos</h1>

      <form action={createProject} className="mt-6 flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder="Nombre del proyecto"
          className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <select
          name="client_id"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          <option value="">Sin cliente asignado</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Crear proyecto
        </button>
      </form>

      <ul className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(projects ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/app/projects/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
              <div>
                <p className="text-neutral-900">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {(p.clients as unknown as { name: string } | null)?.name ?? "Sin cliente"}
                </p>
              </div>
              <span className="text-xs text-neutral-500">{PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL]}</span>
            </Link>
          </li>
        ))}
        {(projects ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-500">Todavía no creaste proyectos.</li>
        )}
      </ul>
    </div>
  );
}
