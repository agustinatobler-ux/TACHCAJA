import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listAdAccounts } from "@/lib/meta/client";
import { createClient } from "@/lib/supabase/server";
import { connectMetaAccounts, updateAdAccountClient } from "@/app/actions/meta";

export default async function ConnectMetaPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("meta_pending_token")?.value;
  if (!token) redirect("/app/ads?meta_error=session_expired");

  const [accounts, supabase] = await Promise.all([listAdAccounts(token), createClient()]);
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");
  const { data: connected } = await supabase
    .from("ad_accounts")
    .select("id, external_account_id, client_id")
    .eq("platform", "meta");
  const connectedByExternalId = new Map((connected ?? []).map((a) => [a.external_account_id, a]));

  const newAccounts = accounts.filter((acc) => !connectedByExternalId.has(acc.account_id));
  const existingAccounts = accounts.filter((acc) => connectedByExternalId.has(acc.account_id));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Conectar cuentas de Meta Ads</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Elegí qué cuentas publicitarias importar y a qué cliente pertenece cada una.
      </p>

      {newAccounts.length > 0 && (
        <form action={connectMetaAccounts} className="mt-6 space-y-3">
          <input type="hidden" name="token" value={token} />
          {newAccounts.map((acc) => (
            <div
              key={acc.account_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                  <input type="checkbox" name="account_ids" value={acc.account_id} defaultChecked />
                  {acc.name}
                </label>
                <p className="ml-6 text-xs text-neutral-500">
                  {acc.business_name ?? "—"} · ID {acc.account_id}
                </p>
              </div>
              <select
                name={`client_for_${acc.account_id}`}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="">Sin cliente asignado</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input type="hidden" name={`name_for_${acc.account_id}`} value={acc.name} />
            </div>
          ))}
          <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Conectar seleccionadas
          </button>
        </form>
      )}

      {existingAccounts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-neutral-700">Ya conectadas — cambiar cliente asignado</h2>
          <div className="mt-2 space-y-3">
            {existingAccounts.map((acc) => {
              const row = connectedByExternalId.get(acc.account_id)!;
              return (
                <form
                  key={acc.account_id}
                  action={updateAdAccountClient}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <input type="hidden" name="ad_account_id" value={row.id} />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{acc.name}</p>
                    <p className="text-xs text-neutral-500">
                      {acc.business_name ?? "—"} · ID {acc.account_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      name="client_id"
                      defaultValue={row.client_id ?? ""}
                      className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">Sin cliente asignado</option>
                      {(clients ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
                      Guardar
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">
          No encontramos cuentas publicitarias asociadas a tu usuario de Meta.
        </p>
      )}
    </div>
  );
}
