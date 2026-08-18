import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { emptyTotals, addTotals, ctr, cpa, roas, formatCurrency, type AdTotals } from "@/lib/ads-metrics";

interface CreativeMetricRow {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ad_creatives: {
    id: string;
    name: string | null;
    image_url: string | null;
    video_url: string | null;
    headline: string | null;
    ad_campaigns: { ad_accounts: { platform: string } | null } | null;
  } | null;
}

type SortKey = "roas" | "cpa" | "ctr";

export default async function CreativeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const sortKey: SortKey = sort === "cpa" || sort === "ctr" ? sort : "roas";

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: rawMetrics } = await supabase
    .from("ad_creative_metrics_daily")
    .select(
      "spend, impressions, clicks, conversions, ad_creatives(id, name, image_url, video_url, headline, ad_campaigns(ad_accounts(platform)))",
    )
    .gte("date", since.toISOString().slice(0, 10));

  const metrics = (rawMetrics ?? []) as unknown as CreativeMetricRow[];

  const byCreative = new Map<
    string,
    { name: string; image: string | null; video: string | null; headline: string | null; platform: string; totals: AdTotals }
  >();
  for (const m of metrics) {
    const c = m.ad_creatives;
    if (!c) continue;
    const existing = byCreative.get(c.id);
    byCreative.set(c.id, {
      name: c.name ?? "Sin nombre",
      image: c.image_url,
      video: c.video_url,
      headline: c.headline,
      platform: c.ad_campaigns?.ad_accounts?.platform ?? "—",
      totals: addTotals(existing?.totals ?? emptyTotals(), m),
    });
  }

  const creatives = Array.from(byCreative.values()).sort((a, b) => {
    if (sortKey === "cpa") return cpa(a.totals) - cpa(b.totals);
    if (sortKey === "ctr") return ctr(b.totals) - ctr(a.totals);
    return roas(b.totals) - roas(a.totals);
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Mejores anuncios</h1>
          <p className="mt-1 text-sm text-neutral-500">Últimos 30 días · ordenado por {sortLabel(sortKey)}</p>
        </div>
        <div className="flex gap-2 text-sm">
          {(["roas", "cpa", "ctr"] as SortKey[]).map((key) => (
            <Link
              key={key}
              href={`/app/ads/creatives?sort=${key}`}
              className={`rounded-md px-3 py-1.5 ${
                sortKey === key ? "bg-neutral-900 text-white" : "border border-neutral-300 hover:bg-neutral-100"
              }`}
            >
              {sortLabel(key)}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {creatives.map((c, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="flex h-40 items-center justify-center bg-neutral-100">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.headline ?? c.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-neutral-400">Sin vista previa</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-900">{c.headline ?? c.name}</p>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] uppercase text-blue-700">
                  {c.platform}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-semibold text-neutral-900">{formatCurrency(c.totals.spend)}</p>
                  <p className="text-neutral-500">Inversión</p>
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{ctr(c.totals).toFixed(2)}%</p>
                  <p className="text-neutral-500">CTR</p>
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{roas(c.totals).toFixed(2)}x</p>
                  <p className="text-neutral-500">ROAS</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {creatives.length === 0 && (
          <p className="col-span-full text-sm text-neutral-500">
            Sin anuncios sincronizados todavía. Conectá una cuenta y sincronizá desde la pantalla de Publicidad.
          </p>
        )}
      </div>
    </div>
  );
}

function sortLabel(key: SortKey) {
  return key === "roas" ? "ROAS" : key === "cpa" ? "CPA" : "CTR";
}
