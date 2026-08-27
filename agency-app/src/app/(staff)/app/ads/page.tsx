import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SyncAdsButton } from "@/components/sync-ads-button";
import { fetchMetricsSince, groupByClient } from "@/lib/ads-data";
import { ctr, cpa, roas, formatCurrency, emptyTotals, type AdTotals } from "@/lib/ads-metrics";
import { roasStatus, cpaStatus, paceStatus, pacePercentLabel, STATUS_CLASS, STATUS_LABEL } from "@/lib/ads-goals";

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ meta_error?: string }>;
}) {
  const { meta_error } = await searchParams;
  const supabase = await createClient();

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: clients }, { data: goalsRows }, { data: accounts }, monthRows] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("client_ad_goals").select("*"),
    supabase.from("ad_accounts").select("id, client_id"),
    fetchMetricsSince(supabase, monthStart),
  ]);

  const goalsByClient = new Map((goalsRows ?? []).map((g) => [g.client_id, g]));
  const monthByClient = groupByClient(monthRows);
  const connectedClientIds = new Set((accounts ?? []).filter((a) => a.client_id).map((a) => a.client_id as string));

  const clientCards = (clients ?? [])
    .filter((c) => connectedClientIds.has(c.id))
    .map((c) => {
      const totals = monthByClient.get(c.id)?.totals ?? emptyTotals();
      const goals = goalsByClient.get(c.id);
      return { client: c, totals, goals };
    });

  const overallTotals = clientCards.reduce((acc, c) => {
    acc.spend += c.totals.spend;
    acc.impressions += c.totals.impressions;
    acc.clicks += c.totals.clicks;
    acc.conversions += c.totals.conversions;
    acc.revenue += c.totals.revenue;
    return acc;
  }, emptyTotals());

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Publicidad</h1>
          <p className="mt-1 text-sm text-neutral-500">Mes en curso, por cliente.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api/meta/connect"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Conectar Meta Ads
          </Link>
          <SyncAdsButton />
          <Link
            href="/app/ads/creatives"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Mejores anuncios
          </Link>
        </div>
      </div>

      {meta_error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo conectar Meta Ads: {meta_error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Inversión (mes)" value={formatCurrency(overallTotals.spend)} />
        <Kpi label="CTR" value={`${ctr(overallTotals).toFixed(2)}%`} />
        <Kpi label="CPA" value={formatCurrency(cpa(overallTotals))} />
        <Kpi label="ROAS" value={`${roas(overallTotals).toFixed(2)}x`} />
      </div>

      {clientCards.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
          Todavía no hay cuentas publicitarias asignadas a un cliente. Conectá Meta Ads y asigná cada cuenta
          desde{" "}
          <Link href="/app/ads/connect/meta" className="underline">
            esta pantalla
          </Link>
          .
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clientCards.map(({ client, totals, goals }) => (
          <ClientCard
            key={client.id}
            clientId={client.id}
            name={client.name}
            totals={totals}
            monthlyBudget={goals?.monthly_budget ?? null}
            targetRoas={goals?.target_roas ?? null}
            targetCpa={goals?.target_cpa ?? null}
            revenueGoal={goals?.revenue_goal ?? null}
            dayOfMonth={dayOfMonth}
            daysInMonth={daysInMonth}
          />
        ))}
      </div>
    </div>
  );
}

function ClientCard({
  clientId,
  name,
  totals,
  monthlyBudget,
  targetRoas,
  targetCpa,
  revenueGoal,
  dayOfMonth,
  daysInMonth,
}: {
  clientId: string;
  name: string;
  totals: AdTotals;
  monthlyBudget: number | null;
  targetRoas: number | null;
  targetCpa: number | null;
  revenueGoal: number | null;
  dayOfMonth: number;
  daysInMonth: number;
}) {
  const actualRoas = roas(totals);
  const actualCpa = cpa(totals);
  const rStatus = roasStatus(actualRoas, targetRoas);
  const cStatus = cpaStatus(actualCpa, totals.conversions, targetCpa);
  const pStatus = paceStatus(totals.spend, monthlyBudget, dayOfMonth, daysInMonth);
  const paceLabel = pacePercentLabel(totals.spend, monthlyBudget, dayOfMonth, daysInMonth);
  const budgetPct = monthlyBudget ? Math.min(100, (totals.spend / monthlyBudget) * 100) : null;
  const revenuePct = revenueGoal ? Math.min(100, (totals.revenue / revenueGoal) * 100) : null;

  return (
    <Link
      href={`/app/ads/clients/${clientId}`}
      className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-neutral-900">{name}</p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge status={rStatus} label={`ROAS ${STATUS_LABEL[rStatus]}`} />
        <Badge status={cStatus} label={`Costo/resultado ${STATUS_LABEL[cStatus]}`} />
        {monthlyBudget && <Badge status={pStatus} label={pStatus === "red" ? "Gasto excedido" : "Gasto en ritmo"} />}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="font-semibold text-neutral-900">{formatCurrency(totals.spend)}</p>
          <p className="text-neutral-500">Gasto</p>
        </div>
        <div>
          <p className="font-semibold text-neutral-900">{formatCurrency(actualCpa)}</p>
          <p className="text-neutral-500">Costo/resultado</p>
        </div>
        <div>
          <p className="font-semibold text-neutral-900">{actualRoas.toFixed(2)}x</p>
          <p className="text-neutral-500">ROAS</p>
        </div>
      </div>

      {revenueGoal && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Objetivo facturación</span>
            <span>{revenuePct?.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${revenuePct}%` }} />
          </div>
        </div>
      )}

      {monthlyBudget && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Presupuesto usado</span>
            <span>{budgetPct?.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full ${pStatus === "red" ? "bg-red-500" : pStatus === "amber" ? "bg-amber-500" : "bg-neutral-900"}`}
              style={{ width: `${Math.min(100, budgetPct ?? 0)}%` }}
            />
          </div>
          {paceLabel && <p className="mt-1 text-[11px] text-neutral-400">{paceLabel}</p>}
        </div>
      )}

      {!monthlyBudget && !targetRoas && !targetCpa && !revenueGoal && (
        <p className="mt-3 text-xs text-neutral-400">Sin objetivos cargados — configuralos en la ficha del cliente.</p>
      )}
    </Link>
  );
}

function Badge({ status, label }: { status: keyof typeof STATUS_CLASS; label: string }) {
  if (status === "neutral") return null;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[status]}`}>{label}</span>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}
