import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inviteClientContact } from "@/app/actions/clients";
import { createProject } from "@/app/actions/projects";
import Link from "next/link";
import { PROJECT_STATUS_LABEL } from "@/lib/types";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: members }, { data: projects }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("client_members")
      .select("profile_id, profiles(full_name, avatar_url)")
      .eq("client_id", id),
    supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);

  if (!client) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{client.name}</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-700">Proyectos</h2>
        <form action={createProject} className="mt-2 flex gap-2">
          <input type="hidden" name="client_id" value={id} />
          <input
            name="name"
            required
            placeholder="Nombre del proyecto"
            className="w-72 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Crear proyecto
          </button>
        </form>
        <ul className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {(projects ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/app/projects/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                <span>{p.name}</span>
                <span className="text-xs text-neutral-500">{PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL]}</span>
              </Link>
            </li>
          ))}
          {(projects ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-500">Sin proyectos todavía.</li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-700">Portal de cliente — contactos con acceso</h2>
        <form action={inviteClientContact} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="client_id" value={id} />
          <input
            name="full_name"
            required
            placeholder="Nombre"
            className="w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Invitar al portal
          </button>
        </form>
        <ul className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {(members ?? []).map((m) => (
            <li key={m.profile_id} className="px-4 py-3 text-sm text-neutral-700">
              {(m.profiles as unknown as { full_name: string })?.full_name || "(pendiente de aceptar invitación)"}
            </li>
          ))}
          {(members ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-500">Nadie tiene acceso al portal todavía.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
