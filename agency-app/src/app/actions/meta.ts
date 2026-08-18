"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  listCampaigns,
  fetchCampaignInsights,
  listAds,
  fetchAdInsights,
  sumActionValue,
  sumAllValues,
} from "@/lib/meta/client";

export async function connectMetaAccounts(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const accountIds = formData.getAll("account_ids").map(String);
  if (!token || accountIds.length === 0) redirect("/app/ads");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const rows = accountIds.map((id) => ({
    platform: "meta" as const,
    external_account_id: id,
    name: String(formData.get(`name_for_${id}`) ?? id),
    client_id: String(formData.get(`client_for_${id}`) ?? "") || null,
    access_token: token,
    connected_by: user.id,
  }));

  const { error } = await supabase.from("ad_accounts").insert(rows);
  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.delete("meta_pending_token");

  revalidatePath("/app/ads");
  redirect("/app/ads");
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Pulls the last `days` of campaign- and ad-level performance for every
// connected Meta ad account and upserts it into the local tables the
// dashboard reads from.
export async function syncMetaData(days = 30) {
  const supabase = await createClient();
  const { data: accounts, error } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("platform", "meta");
  if (error) throw new Error(error.message);

  const since = isoDaysAgo(days);
  const until = isoDaysAgo(0);

  for (const account of accounts ?? []) {
    const token = account.access_token as string;
    const accountId = account.external_account_id as string;

    const campaigns = await listCampaigns(accountId, token);
    for (const campaign of campaigns) {
      await supabase
        .from("ad_campaigns")
        .upsert(
          {
            ad_account_id: account.id,
            external_campaign_id: campaign.id,
            name: campaign.name,
            status: campaign.status,
          },
          { onConflict: "ad_account_id,external_campaign_id" },
        );
    }

    const { data: dbCampaigns } = await supabase
      .from("ad_campaigns")
      .select("id, external_campaign_id")
      .eq("ad_account_id", account.id);
    const campaignIdMap = new Map((dbCampaigns ?? []).map((c) => [c.external_campaign_id, c.id]));

    const insights = await fetchCampaignInsights(accountId, token, since, until);
    for (const row of insights) {
      const dbCampaignId = campaignIdMap.get(row.campaign_id);
      if (!dbCampaignId) continue;
      const conversions = sumActionValue(row.actions, "offsite_conversion.fb_pixel_purchase");
      const revenue = sumActionValue(row.action_values, "offsite_conversion.fb_pixel_purchase");
      await supabase.from("ad_metrics_daily").upsert(
        {
          ad_campaign_id: dbCampaignId,
          date: row.date_start,
          spend: Number(row.spend ?? 0),
          impressions: Number(row.impressions ?? 0),
          clicks: Number(row.clicks ?? 0),
          conversions,
          revenue,
        },
        { onConflict: "ad_campaign_id,date" },
      );
    }

    const ads = await listAds(accountId, token);
    for (const ad of ads) {
      const dbCampaignId = campaignIdMap.get(ad.campaign_id);
      if (!dbCampaignId) continue;
      await supabase.from("ad_creatives").upsert(
        {
          ad_campaign_id: dbCampaignId,
          external_ad_id: ad.id,
          name: ad.name,
          image_url: ad.creative?.image_url ?? ad.creative?.thumbnail_url ?? null,
          video_url: ad.creative?.video_id
            ? `https://www.facebook.com/video.php?v=${ad.creative.video_id}`
            : null,
          headline: ad.creative?.title ?? null,
          body_text: ad.creative?.body ?? null,
        },
        { onConflict: "ad_campaign_id,external_ad_id" },
      );
    }

    const { data: dbCreatives } = await supabase
      .from("ad_creatives")
      .select("id, external_ad_id")
      .in("ad_campaign_id", Array.from(campaignIdMap.values()));
    const creativeIdMap = new Map((dbCreatives ?? []).map((c) => [c.external_ad_id, c.id]));

    const adInsights = await fetchAdInsights(accountId, token, since, until);
    for (const row of adInsights) {
      const dbCreativeId = creativeIdMap.get(row.ad_id);
      if (!dbCreativeId) continue;
      const conversions = sumActionValue(row.actions, "offsite_conversion.fb_pixel_purchase");
      await supabase.from("ad_creative_metrics_daily").upsert(
        {
          ad_creative_id: dbCreativeId,
          date: row.date_start,
          spend: Number(row.spend ?? 0),
          impressions: Number(row.impressions ?? 0),
          clicks: Number(row.clicks ?? 0),
          conversions,
          video_25_pct: sumAllValues(row.video_p25_watched_actions),
          video_50_pct: sumAllValues(row.video_p50_watched_actions),
          video_75_pct: sumAllValues(row.video_p75_watched_actions),
          video_100_pct: sumAllValues(row.video_p100_watched_actions),
        },
        { onConflict: "ad_creative_id,date" },
      );
    }
  }

  revalidatePath("/app/ads");
  revalidatePath("/app/ads/creatives");
}
