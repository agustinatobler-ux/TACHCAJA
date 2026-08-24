import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForToken, exchangeForLongLivedToken } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error_description") || searchParams.get("error");
  const expectedState = request.cookies.get("meta_oauth_state")?.value;

  if (error) {
    const response = NextResponse.redirect(`${origin}/app/ads?meta_error=${encodeURIComponent(error)}`);
    response.cookies.delete("meta_oauth_state");
    return response;
  }
  if (!code || !state || state !== expectedState) {
    const reason = !expectedState ? "expired_session" : "invalid_state";
    const response = NextResponse.redirect(`${origin}/app/ads?meta_error=${reason}`);
    response.cookies.delete("meta_oauth_state");
    return response;
  }

  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    const response = NextResponse.redirect(`${origin}/app/ads/connect/meta`);
    response.cookies.delete("meta_oauth_state");
    response.cookies.set("meta_pending_token", longLived.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
    return response;
  } catch (err) {
    const response = NextResponse.redirect(
      `${origin}/app/ads?meta_error=${encodeURIComponent(err instanceof Error ? err.message : "unknown")}`,
    );
    response.cookies.delete("meta_oauth_state");
    return response;
  }
}
