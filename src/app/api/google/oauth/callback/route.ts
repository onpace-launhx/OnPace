import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Step 2: Handle callback from Google with auth code
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=access_denied", request.url)
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
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error("Failed to get access token:", tokenData);
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=token_failed", request.url)
    );
  }

  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in || 3600) * 1000
  ).toISOString();

  // Upsert token into Supabase
  const { error: dbError } = await supabase
    .from("user_google_tokens")
    .upsert(
      {
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || "",
        expires_at: expiresAt,
        scope: tokenData.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (dbError) {
    console.error("Failed to save token to Supabase:", dbError);
    return NextResponse.redirect(
      new URL("/dashboard?calendar_error=db_failed", request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard?calendar_connected=true", request.url)
  );
}
