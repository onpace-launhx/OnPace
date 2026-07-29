import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

function appUrl(path: string, request: NextRequest) {
  return siteUrl(path, request.nextUrl.origin);
}

// Step 2: Handle callback from Google with auth code
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(appUrl("/login", request));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("google_calendar_oauth_state")?.value;

  if (error || !code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      appUrl(`/dashboard?calendar_error=${state !== expectedState ? "invalid_state" : "access_denied"}`, request)
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:
        process.env.GOOGLE_REDIRECT_URI ||
        siteUrl("/api/google/oauth/callback").toString(),
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error("Failed to get access token:", tokenData);
    return NextResponse.redirect(
      appUrl("/dashboard?calendar_error=token_failed", request)
    );
  }

  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in || 3600) * 1000
  ).toISOString();

  const { data: existingToken } = await supabase
    .from("user_google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  // Upsert token into Supabase
  const { error: dbError } = await supabase
    .from("user_google_tokens")
    .upsert(
      {
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || existingToken?.refresh_token || "",
        expires_at: expiresAt,
        scope: tokenData.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (dbError) {
    console.error("Failed to save token to Supabase:", dbError);
    return NextResponse.redirect(
      appUrl("/dashboard?calendar_error=db_failed", request)
    );
  }

  const response = NextResponse.redirect(
    appUrl("/calendar?calendar_connected=true", request)
  );
  response.cookies.delete("google_calendar_oauth_state");
  return response;
}
