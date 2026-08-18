import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, exchangeForLongLivedToken } from "@/lib/meta/client";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error_description") || searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("meta_oauth_state")?.value;
  cookieStore.delete("meta_oauth_state");

  if (error) {
    return NextResponse.redirect(`${origin}/app/ads?meta_error=${encodeURIComponent(error)}`);
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${origin}/app/ads?meta_error=invalid_state`);
  }

  try {
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);

    cookieStore.set("meta_pending_token", longLived.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    return NextResponse.redirect(`${origin}/app/ads/connect/meta`);
  } catch (err) {
    return NextResponse.redirect(
      `${origin}/app/ads?meta_error=${encodeURIComponent(err instanceof Error ? err.message : "unknown")}`,
    );
  }
}
