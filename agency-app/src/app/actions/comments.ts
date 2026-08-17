"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addComment(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const clientVisible = formData.get("client_visible") === "on";
  if (!taskId || !body) throw new Error("Falta el texto del comentario");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("comments")
    .insert({ task_id: taskId, author_id: user.id, body, client_visible: clientVisible });
  if (error) throw new Error(error.message);

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
}
