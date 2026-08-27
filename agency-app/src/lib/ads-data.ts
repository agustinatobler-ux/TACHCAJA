import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyTotals, addTotals, type AdTotals } from "@/lib/ads-metrics";

interface MetricJoinRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ad_campaigns: {
    id: string;
    name: string;
    ad_accounts: { client_id: string | null; platform: string } | null;
  } | null;
}

export async function fetchMetricsSince(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sinceDate: string,
): Promise<MetricJoinRow[]> {
  const { data } = await supabase
    .from("ad_metrics_daily")
    .select(
      "date, spend, impressions, clicks, conversions, revenue, ad_campaigns(id, name, ad_accounts(client_id, platform))",
    )
    .gte("date", sinceDate);
  return (data ?? []) as unknown as MetricJoinRow[];
}

export interface ClientTotals {
  totals: AdTotals;
  platforms: Set<string>;
}

export function groupByClient(rows: MetricJoinRow[]): Map<string, ClientTotals> {
  const byClient = new Map<string, ClientTotals>();
  for (const row of rows) {
    const clientId = row.ad_campaigns?.ad_accounts?.client_id;
    if (!clientId) continue;
    const existing = byClient.get(clientId);
    const totals = addTotals(existing?.totals ?? emptyTotals(), row);
    const platforms = existing?.platforms ?? new Set<string>();
    if (row.ad_campaigns?.ad_accounts?.platform) platforms.add(row.ad_campaigns.ad_accounts.platform);
    byClient.set(clientId, { totals, platforms });
  }
  return byClient;
}
