"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "") || null;
  if (!name) throw new Error("El nombre del proyecto es obligatorio");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("projects")
    .insert({ name, client_id: clientId, created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/app/projects");
  redirect(`/app/projects/${data.id}`);
}

export async function createTask(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const clientVisible = formData.get("client_visible") === "on";
  if (!projectId || !name) throw new Error("Faltan datos de la tarea");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, name, client_visible: clientVisible, created_by: user.id });
  if (error) throw new Error(error.message);

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
}

export async function toggleTaskVisibility(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const clientVisible = formData.get("client_visible") === "on";

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ client_visible: clientVisible }).eq("id", taskId);
  if (error) throw new Error(error.message);

  revalidatePath(`/app/projects/${projectId}/tasks/${taskId}`);
  revalidatePath(`/portal/projects/${projectId}`);
}

export async function updateTaskStatus(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const status = String(formData.get("status") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
}
