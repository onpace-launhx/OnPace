import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Helper: refresh access token if expired
async function getValidAccessToken(
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data: tokenRow, error } = await supabase
    .from("user_google_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) return null;

  const now = new Date();
  const expiresAt = new Date(tokenRow.expires_at);

  // Token is still valid
  if (expiresAt > now) return tokenRow.access_token;

  // Refresh the token
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const refreshData = await refreshRes.json();
  if (!refreshData.access_token) return null;

  const newExpiresAt = new Date(
    Date.now() + (refreshData.expires_in || 3600) * 1000
  ).toISOString();

  await supabase
    .from("user_google_tokens")
    .update({
      access_token: refreshData.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return refreshData.access_token;
}

export { getValidAccessToken };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getValidAccessToken(supabase, user.id);

  if (!accessToken) {
    return NextResponse.json(
      { error: "Google Calendar not connected", connected: false },
      { status: 200 }
    );
  }

  const now = new Date();
  const maxTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // next 30 days

  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
      `?maxResults=20&orderBy=startTime&singleEvents=true` +
      `&timeMin=${now.toISOString()}&timeMax=${maxTime.toISOString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const calData = await calRes.json();

  const events = (calData.items || []).map((e: any) => ({
    id: e.id,
    summary: e.summary,
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    description: e.description || "",
    htmlLink: e.htmlLink,
  }));

  return NextResponse.json({ connected: true, events });
}
