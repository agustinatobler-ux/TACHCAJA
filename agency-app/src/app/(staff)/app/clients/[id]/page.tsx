import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { saveClientAdGoals } from "@/app/actions/clients";
import { formatCurrency } from "@/lib/ads-metrics";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: adAccounts }, { data: goals }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("ad_accounts").select("id, platform, name, external_account_id").eq("client_id", id),
    supabase.from("client_ad_goals").select("*").eq("client_id", id).maybeSingle(),
  ]);

  if (!client) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{client.name}</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-700">Cuentas publicitarias conectadas</h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {(adAccounts ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-neutral-900">{a.name}</span>
              <span className="text-xs uppercase text-neutral-500">{a.platform} · {a.external_account_id}</span>
            </li>
          ))}
          {(adAccounts ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-500">
              Sin cuentas conectadas. Andá a{" "}
              <Link href="/app/ads" className="underline">
                Publicidad
              </Link>{" "}
              para conectar Meta Ads y asignarle una a este cliente.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-700">Objetivos (para el semáforo del dashboard)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Dejá vacío lo que no quieras controlar. Presupuesto y valor de facturación en pesos.
        </p>
        <form action={saveClientAdGoals} className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-4">
          <input type="hidden" name="client_id" value={id} />
          <label className="text-sm">
            <span className="block text-xs text-neutral-500">Presupuesto mensual</span>
            <input
              name="monthly_budget"
              type="number"
              step="0.01"
              defaultValue={goals?.monthly_budget ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-neutral-500">ROAS objetivo</span>
            <input
              name="target_roas"
              type="number"
              step="0.01"
              defaultValue={goals?.target_roas ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-neutral-500">Costo por resultado objetivo</span>
            <input
              name="target_cpa"
              type="number"
              step="0.01"
              defaultValue={goals?.target_cpa ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-neutral-500">Objetivo de facturación</span>
            <input
              name="revenue_goal"
              type="number"
              step="0.01"
              defaultValue={goals?.revenue_goal ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="col-span-2 sm:col-span-4">
            <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
              Guardar objetivos
            </button>
          </div>
        </form>
        {goals?.monthly_budget != null && (
          <p className="mt-2 text-xs text-neutral-500">
            Presupuesto actual: {formatCurrency(goals.monthly_budget)}
          </p>
        )}
      </section>
    </div>
  );
}
