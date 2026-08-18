import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SyncAdsButton } from "@/components/sync-ads-button";
import {
  emptyTotals,
  addTotals,
  ctr,
  cpc,
  cpa,
  roas,
  formatCurrency,
  formatNumber,
  type AdTotals,
} from "@/lib/ads-metrics";

interface MetricRow {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ad_campaigns: {
    id: string;
    name: string;
    tag: string | null;
    ad_accounts: { platform: string; name: string; client_id: string | null } | null;
  } | null;
}

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ meta_error?: string }>;
}) {
  const { meta_error } = await searchParams;
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: accounts }, { data: rawMetrics }] = await Promise.all([
    supabase.from("ad_accounts").select("id, platform, name"),
    supabase
      .from("ad_metrics_daily")
      .select("spend, impressions, clicks, conversions, revenue, ad_campaigns(id, name, tag, ad_accounts(platform, name, client_id))")
      .gte("date", sinceStr),
  ]);

  const metrics = (rawMetrics ?? []) as unknown as MetricRow[];

  const total = metrics.reduce((acc, m) => addTotals(acc, m), emptyTotals());

  const byCampaign = new Map<string, { name: string; platform: string; tag: string | null; totals: AdTotals }>();
  for (const m of metrics) {
    const c = m.ad_campaigns;
    if (!c) continue;
    const existing = byCampaign.get(c.id);
    const totals = addTotals(existing?.totals ?? emptyTotals(), m);
    byCampaign.set(c.id, {
      name: c.name,
      platform: c.ad_accounts?.platform ?? "—",
      tag: c.tag,
      totals,
    });
  }
  const campaigns = Array.from(byCampaign.values()).sort((a, b) => b.totals.spend - a.totals.spend);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Publicidad — KPIs</h1>
          <p className="mt-1 text-sm text-neutral-500">Últimos 30 días, Meta Ads + Google Ads combinados.</p>
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
            Ver mejores anuncios
          </Link>
        </div>
      </div>

      {meta_error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo conectar Meta Ads: {meta_error}
        </p>
      )}

      {(accounts ?? []).length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
          Todavía no conectaste ninguna cuenta publicitaria. Tocá &quot;Conectar Meta Ads&quot; para empezar.
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Inversión" value={formatCurrency(total.spend)} />
        <Kpi label="Impresiones" value={formatNumber(total.impressions)} />
        <Kpi label="Clics" value={formatNumber(total.clicks)} />
        <Kpi label="CTR" value={`${ctr(total).toFixed(2)}%`} />
        <Kpi label="CPC medio" value={formatCurrency(cpc(total))} />
        <Kpi label="Conversiones" value={formatNumber(total.conversions)} />
        <Kpi label="CPA" value={formatCurrency(cpa(total))} />
        <Kpi label="ROAS" value={`${roas(total).toFixed(2)}x`} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Campaña</th>
              <th className="px-4 py-3">Plataforma</th>
              <th className="px-4 py-3">Inversión</th>
              <th className="px-4 py-3">Clics</th>
              <th className="px-4 py-3">Conversiones</th>
              <th className="px-4 py-3">CTR</th>
              <th className="px-4 py-3">CPA</th>
              <th className="px-4 py-3">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {campaigns.map((c) => (
              <tr key={c.name}>
                <td className="px-4 py-3 text-neutral-900">
                  {c.name}
                  {c.tag && (
                    <span className="ml-2 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] uppercase text-purple-700">
                      {c.tag}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-neutral-600">{c.platform}</td>
                <td className="px-4 py-3">{formatCurrency(c.totals.spend)}</td>
                <td className="px-4 py-3">{formatNumber(c.totals.clicks)}</td>
                <td className="px-4 py-3">{formatNumber(c.totals.conversions)}</td>
                <td className="px-4 py-3">{ctr(c.totals).toFixed(2)}%</td>
                <td className="px-4 py-3">{formatCurrency(cpa(c.totals))}</td>
                <td className="px-4 py-3">{roas(c.totals).toFixed(2)}x</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                  Sin datos todavía. Conectá una cuenta y sincronizá.
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
