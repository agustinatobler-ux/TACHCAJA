import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClientRecord } from "@/app/actions/clients";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Clientes</h1>

      <form action={createClientRecord} className="mt-6 flex gap-2">
        <input
          name="name"
          required
          placeholder="Nombre del cliente"
          className="w-72 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Agregar cliente
        </button>
      </form>

      <ul className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {(clients ?? []).map((c) => (
          <li key={c.id}>
            <Link href={`/app/clients/${c.id}`} className="block px-4 py-3 hover:bg-neutral-50">
              {c.name}
            </Link>
          </li>
        ))}
        {(clients ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-500">Todavía no agregaste clientes.</li>
        )}
      </ul>
    </div>
  );
}
