import "server-only";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function metaRedirectUri() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/api/meta/callback`;
}

export function metaOAuthDialogUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: metaRedirectUri(),
    scope: "ads_read,business_management",
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: metaRedirectUri(),
    code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta long-lived token exchange failed: ${await res.text()}`);
  return res.json();
}

export interface MetaAdAccount {
  account_id: string;
  id: string;
  name: string;
  business_name?: string;
}

export async function listAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const params = new URLSearchParams({
    fields: "account_id,name,business_name",
    access_token: accessToken,
    limit: "200",
  });
  const res = await fetch(`${GRAPH_BASE}/me/adaccounts?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta ad accounts fetch failed: ${await res.text()}`);
  const json = await res.json();
  return json.data ?? [];
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
}

export async function listCampaigns(adAccountId: string, accessToken: string): Promise<MetaCampaign[]> {
  const params = new URLSearchParams({
    fields: "id,name,status",
    access_token: accessToken,
    limit: "200",
  });
  const res = await fetch(`${GRAPH_BASE}/act_${adAccountId}/campaigns?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta campaigns fetch failed: ${await res.text()}`);
  const json = await res.json();
  return json.data ?? [];
}

export interface MetaInsightRow {
  campaign_id: string;
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

export async function fetchCampaignInsights(
  adAccountId: string,
  accessToken: string,
  since: string,
  until: string,
): Promise<MetaInsightRow[]> {
  const params = new URLSearchParams({
    fields: "campaign_id,spend,impressions,clicks,actions,action_values",
    level: "campaign",
    time_range: JSON.stringify({ since, until }),
    time_increment: "1",
    access_token: accessToken,
    limit: "500",
  });
  const res = await fetch(`${GRAPH_BASE}/act_${adAccountId}/insights?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta insights fetch failed: ${await res.text()}`);
  const json = await res.json();
  return json.data ?? [];
}

export interface MetaAd {
  id: string;
  name: string;
  campaign_id: string;
  creative?: { id: string; thumbnail_url?: string; image_url?: string; video_id?: string; title?: string; body?: string };
}

export async function listAds(adAccountId: string, accessToken: string): Promise<MetaAd[]> {
  const params = new URLSearchParams({
    fields: "id,name,campaign_id,creative{id,thumbnail_url,image_url,video_id,title,body}",
    access_token: accessToken,
    limit: "200",
  });
  const res = await fetch(`${GRAPH_BASE}/act_${adAccountId}/ads?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta ads fetch failed: ${await res.text()}`);
  const json = await res.json();
  return json.data ?? [];
}

export interface MetaAdInsightRow extends MetaInsightRow {
  ad_id: string;
  video_p25_watched_actions?: { action_type: string; value: string }[];
  video_p50_watched_actions?: { action_type: string; value: string }[];
  video_p75_watched_actions?: { action_type: string; value: string }[];
  video_p100_watched_actions?: { action_type: string; value: string }[];
}

export async function fetchAdInsights(
  adAccountId: string,
  accessToken: string,
  since: string,
  until: string,
): Promise<MetaAdInsightRow[]> {
  const params = new URLSearchParams({
    fields: "ad_id,campaign_id,spend,impressions,clicks,actions,action_values,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_thruplay_watched_actions",
    level: "ad",
    time_range: JSON.stringify({ since, until }),
    time_increment: "1",
    access_token: accessToken,
    limit: "500",
  });
  const res = await fetch(`${GRAPH_BASE}/act_${adAccountId}/insights?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta ad insights fetch failed: ${await res.text()}`);
  const json = await res.json();
  return json.data ?? [];
}

export function sumActionValue(actions: { action_type: string; value: string }[] | undefined, type: string) {
  if (!actions) return 0;
  const match = actions.find((a) => a.action_type === type);
  return match ? Number(match.value) : 0;
}

export function sumAllValues(actions: { action_type: string; value: string }[] | undefined) {
  if (!actions) return 0;
  return actions.reduce((total, a) => total + Number(a.value), 0);
}
