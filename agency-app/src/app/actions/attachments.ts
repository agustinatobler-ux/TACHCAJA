"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function uploadDeliverable(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const file = formData.get("file") as File | null;
  if (!taskId || !file || file.size === 0) throw new Error("Falta el archivo");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Archivo muy pesado para este MVP (máx 8MB). Para videos, pegá un link de Drive/Frame.io.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role === "client") throw new Error("Solo el equipo de la agencia sube entregables");

  const admin = createAdminClient();
  const path = `${taskId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await admin.storage
    .from("deliverables")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("attachments").insert({
    task_id: taskId,
    uploaded_by: user.id,
    file_name: file.name,
    file_type: file.type,
    storage_path: path,
    is_deliverable: true,
  });
  if (insertError) throw new Error(insertError.message);

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
}

export async function setApprovalStatus(formData: FormData) {
  const attachmentId = String(formData.get("attachment_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["approved", "changes_requested", "pending"].includes(status)) {
    throw new Error("Estado inválido");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("attachments")
    .update({ approval_status: status })
    .eq("id", attachmentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
}

export async function addProofingNote(formData: FormData) {
  const attachmentId = String(formData.get("attachment_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const xPct = Number(formData.get("x_pct") ?? 0);
  const yPct = Number(formData.get("y_pct") ?? 0);
  if (!attachmentId || !body) throw new Error("Falta el comentario");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("proofing_annotations").insert({
    attachment_id: attachmentId,
    author_id: user.id,
    x_pct: xPct,
    y_pct: yPct,
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
}
