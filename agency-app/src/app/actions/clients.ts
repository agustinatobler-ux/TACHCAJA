"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createClientRecord(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("El nombre del cliente es obligatorio");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("clients").insert({ name, created_by: user.id });
  if (error) throw new Error(error.message);

  revalidatePath("/app/clients");
}

export async function saveClientAdGoals(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) throw new Error("Falta el cliente");

  const toNumber = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw ? Number(raw) : null;
  };

  const supabase = await createClient();
  const { error } = await supabase.from("client_ad_goals").upsert({
    client_id: clientId,
    monthly_budget: toNumber("monthly_budget"),
    target_roas: toNumber("target_roas"),
    target_cpa: toNumber("target_cpa"),
    revenue_goal: toNumber("revenue_goal"),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath("/app/ads");
}
