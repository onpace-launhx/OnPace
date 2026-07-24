import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { getValidAccessToken } from "@/lib/google-auth";

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
