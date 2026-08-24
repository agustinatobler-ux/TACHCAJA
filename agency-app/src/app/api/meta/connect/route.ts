import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { metaOAuthDialogUrl } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(metaOAuthDialogUrl(state));
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 30,
    path: "/",
  });
  return response;
}
