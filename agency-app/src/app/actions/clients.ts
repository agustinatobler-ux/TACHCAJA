"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// Invites a contact at the client company. They land in the read-only
// client portal, scoped to this one client, once they set a password.
export async function inviteClientContact(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!clientId || !email) throw new Error("Faltan datos del contacto");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${siteUrl}/auth/callback?type=invite`,
  });
  if (error) throw new Error(error.message);

  const invitedId = data.user.id;

  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: "client", full_name: fullName })
    .eq("id", invitedId);
  if (roleError) throw new Error(roleError.message);

  const { error: memberError } = await admin
    .from("client_members")
    .insert({ client_id: clientId, profile_id: invitedId });
  if (memberError) throw new Error(memberError.message);

  revalidatePath(`/app/clients/${clientId}`);
}
