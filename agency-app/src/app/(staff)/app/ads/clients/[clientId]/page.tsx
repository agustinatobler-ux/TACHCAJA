import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emptyTotals, addTotals, ctr, cpc, cpa, roas, formatCurrency, formatNumber, type AdTotals } from "@/lib/ads-metrics";
import { roasStatus, cpaStatus, paceStatus, pacePercentLabel, STATUS_CLASS, STATUS_LABEL } from "@/lib/ads-goals";

interface DailyRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ad_campaign_id: string;
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function ClientAdsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: goals }, { data: accounts }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("client_ad_goals").select("*").eq("client_id", clientId).maybeSingle(),
    supabase.from("ad_accounts").select("id, platform, name").eq("client_id", clientId),
  ]);
  if (!client) notFound();

  const accountIds = (accounts ?? []).map((a) => a.id);
  const { data: campaigns } = accountIds.length
    ? await supabase.from("ad_campaigns").select("id, name, ad_account_id").in("ad_account_id", accountIds)
    : { data: [] as { id: string; name: string; ad_account_id: string }[] };
  const campaignIds = (campaigns ?? []).map((c) => c.id);
  const campaignNameById = new Map((campaigns ?? []).map((c) => [c.id, c.name]));

  const since30 = isoDaysAgo(30);
  const { data: rawRows } = campaignIds.length
    ? await supabase
        .from("ad_metrics_daily")
        .select("date, spend, impressions, clicks, conversions, revenue, ad_campaign_id")
        .in("ad_campaign_id", campaignIds)
        .gte("date", since30)
    : { data: [] as DailyRow[] };
  const rows = (rawRows ?? []) as DailyRow[];

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const monthTotals = rows.filter((r) => r.date >= monthStart).reduce((acc, r) => addTotals(acc, r), emptyTotals());
  const total30 = rows.reduce((acc, r) => addTotals(acc, r), emptyTotals());

  const byCampaign = new Map<string, AdTotals>();
  for (const r of rows) {
    byCampaign.set(r.ad_campaign_id, addTotals(byCampaign.get(r.ad_campaign_id) ?? emptyTotals(), r));
  }
  const campaignRows = Array.from(byCampaign.entries())
    .map(([id, totals]) => ({ id, name: campaignNameById.get(id) ?? id, totals }))
    .sort((a, b) => b.totals.spend - a.totals.spend);

  // Insights: compare last 7 days to the 7 days before that, per campaign
  const last7Start = isoDaysAgo(7);
  const prev7Start = isoDaysAgo(14);
  const insights: string[] = [];
  for (const c of campaignRows) {
    const last7 = rows
      .filter((r) => r.ad_campaign_id === c.id && r.date >= last7Start)
      .reduce((acc, r) => addTotals(acc, r), emptyTotals());
    const prev7 = rows
      .filter((r) => r.ad_campaign_id === c.id && r.date >= prev7Start && r.date < last7Start)
      .reduce((acc, r) => addTotals(acc, r), emptyTotals());

    if (prev7.spend > 0 && last7.spend === 0) {
      insights.push(`⚠️ "${c.name}" dejó de gastar en los últimos 7 días (antes gastaba ${formatCurrency(prev7.spend)}/semana).`);
      continue;
    }
    if (prev7.conversions > 0 && last7.conversions > 0) {
      const prevCpa = prev7.spend / prev7.conversions;
      const lastCpa = last7.spend / last7.conversions;
      const change = ((lastCpa - prevCpa) / prevCpa) * 100;
      if (change >= 25) {
        insights.push(`📈 El costo por resultado de "${c.name}" subió ${change.toFixed(0)}% esta semana vs la anterior.`);
      } else if (change <= -25) {
        insights.push(`📉 El costo por resultado de "${c.name}" bajó ${Math.abs(change).toFixed(0)}% esta semana — buen momento para escalar.`);
      }
    }
  }
  if (campaignRows.length > 1) {
    const best = [...campaignRows].sort((a, b) => roas(b.totals) - roas(a.totals))[0];
    if (roas(best.totals) > 0) {
      insights.push(`🏆 "${best.name}" es la campaña con mejor ROAS de los últimos 30 días (${roas(best.totals).toFixed(2)}x).`);
    }
  }

  const rStatus = roasStatus(roas(monthTotals), goals?.target_roas ?? null);
  const cStatus = cpaStatus(cpa(monthTotals), monthTotals.conversions, goals?.target_cpa ?? null);
  const pStatus = paceStatus(monthTotals.spend, goals?.monthly_budget ?? null, dayOfMonth, daysInMonth);
  const paceLabel = pacePercentLabel(monthTotals.spend, goals?.monthly_budget ?? null, dayOfMonth, daysInMonth);

  return (
    <div>
      <Link href="/app/ads" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Publicidad
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">{client.name}</h1>
        <div className="flex gap-2">
          <Link
            href={`/app/clients/${clientId}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
          >
            Editar objetivos
          </Link>
          <Link
            href={`/app/ads/creatives?client=${clientId}`}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Mejores anuncios
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {goals?.target_roas && (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[rStatus]}`}>
            ROAS {roas(monthTotals).toFixed(2)}x / objetivo {goals.target_roas}x — {STATUS_LABEL[rStatus]}
          </span>
        )}
        {goals?.target_cpa && (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[cStatus]}`}>
            Costo/resultado {formatCurrency(cpa(monthTotals))} / objetivo {formatCurrency(goals.target_cpa)} — {STATUS_LABEL[cStatus]}
          </span>
        )}
        {goals?.monthly_budget && (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[pStatus]}`}>
            Presupuesto: {paceLabel}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Inversión (30 días)" value={formatCurrency(total30.spend)} />
        <Kpi label="CTR" value={`${ctr(total30).toFixed(2)}%`} />
        <Kpi label="CPC medio" value={formatCurrency(cpc(total30))} />
        <Kpi label="Conversiones" value={formatNumber(total30.conversions)} />
        <Kpi label="CPA" value={formatCurrency(cpa(total30))} />
        <Kpi label="ROAS" value={`${roas(total30).toFixed(2)}x`} />
        <Kpi label="Impresiones" value={formatNumber(total30.impressions)} />
        <Kpi label="Clics" value={formatNumber(total30.clicks)} />
      </div>

      {insights.length > 0 && (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-700">Insights</h2>
          <ul className="mt-2 space-y-2 text-sm text-neutral-700">
            {insights.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Campaña</th>
              <th className="px-4 py-3">Inversión</th>
              <th className="px-4 py-3">Clics</th>
              <th className="px-4 py-3">Conversiones</th>
              <th className="px-4 py-3">CTR</th>
              <th className="px-4 py-3">CPA</th>
              <th className="px-4 py-3">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {campaignRows.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-neutral-900">{c.name}</td>
                <td className="px-4 py-3">{formatCurrency(c.totals.spend)}</td>
                <td className="px-4 py-3">{formatNumber(c.totals.clicks)}</td>
                <td className="px-4 py-3">{formatNumber(c.totals.conversions)}</td>
                <td className="px-4 py-3">{ctr(c.totals).toFixed(2)}%</td>
                <td className="px-4 py-3">{formatCurrency(cpa(c.totals))}</td>
                <td className="px-4 py-3">{roas(c.totals).toFixed(2)}x</td>
              </tr>
            ))}
            {campaignRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  Sin datos todavía. Sincronizá desde la pantalla de Publicidad.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
