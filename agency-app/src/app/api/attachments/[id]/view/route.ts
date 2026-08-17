import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Permission is decided by selecting the row through the user's own
// Supabase client, which applies the `attachments` RLS policies — staff see
// everything, clients only see deliverables on their own visible tasks.
// Only once that succeeds do we mint a signed URL with the service role.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: attachment, error } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (error || !attachment) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("deliverables")
    .createSignedUrl(attachment.storage_path, 60 * 10);

  if (signError || !signed) {
    return NextResponse.json({ error: "No se pudo generar el link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
