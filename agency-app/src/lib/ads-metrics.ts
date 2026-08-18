export interface AdTotals {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export function emptyTotals(): AdTotals {
  return { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
}

export function addTotals(a: AdTotals, b: Partial<AdTotals>): AdTotals {
  return {
    spend: a.spend + (b.spend ?? 0),
    impressions: a.impressions + (b.impressions ?? 0),
    clicks: a.clicks + (b.clicks ?? 0),
    conversions: a.conversions + (b.conversions ?? 0),
    revenue: a.revenue + (b.revenue ?? 0),
  };
}

export function ctr(t: AdTotals) {
  return t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
}

export function cpc(t: AdTotals) {
  return t.clicks > 0 ? t.spend / t.clicks : 0;
}

export function cpa(t: AdTotals) {
  return t.conversions > 0 ? t.spend / t.conversions : 0;
}

export function roas(t: AdTotals) {
  return t.spend > 0 ? t.revenue / t.spend : 0;
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("es-AR").format(Math.round(n));
}
