import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google-auth";

/** Update an event that belongs to the signed-in user's primary Google calendar. */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = await getValidAccessToken(supabase, user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google Calendar not connected", connected: false },
      { status: 200 }
    );
  }

  const body = await request.json().catch(() => null);
  const eventId = typeof body?.eventId === "string" ? body.eventId.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const start = typeof body?.start === "string" ? body.start : "";
  const end = typeof body?.end === "string" ? body.end : "";

  if (!eventId || !summary || !start || !end) {
    return NextResponse.json(
      { error: "eventId, title, start time, and end time are required" },
      { status: 400 }
    );
  }

  const calendarUrl =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/` +
    encodeURIComponent(eventId);
  const googleResponse = await fetch(calendarUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary,
      description: typeof body?.description === "string" ? body.description : "",
      start: { dateTime: start },
      end: { dateTime: end },
    }),
  });

  const data = await googleResponse.json().catch(() => ({}));
  if (!googleResponse.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Failed to update Google Calendar event" },
      { status: googleResponse.status || 500 }
    );
  }

  return NextResponse.json({
    success: true,
    event: {
      id: data.id,
      summary: data.summary,
      start: data.start?.dateTime || data.start?.date,
      end: data.end?.dateTime || data.end?.date,
      description: data.description || "",
      htmlLink: data.htmlLink,
    },
  });
}
