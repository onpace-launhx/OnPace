import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google-auth";

export async function POST(request: NextRequest) {
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

  const {
    summary,
    title,
    start,
    startTime,
    end,
    durationMinutes,
    description,
  } = await request.json();
  const eventSummary = summary || title;
  const eventStart = start || startTime;
  const eventEnd =
    end ||
    (eventStart
      ? new Date(
          new Date(eventStart).getTime() +
            (Number(durationMinutes) || 60) * 60_000
        ).toISOString()
      : null);

  if (!eventSummary || !eventStart || !eventEnd) {
    return NextResponse.json(
      { error: "Event title, start time, and end time are required" },
      { status: 400 }
    );
  }

  const calRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: eventSummary,
        description: description || "",
        start: { dateTime: eventStart },
        end: { dateTime: eventEnd },
      }),
    }
  );

  const calData = await calRes.json();

  if (!calData.id) {
    console.error("Failed to create event:", calData);
    return NextResponse.json({
      error: calData?.error?.message || "Failed to create calendar event",
    }, { status: calRes.status || 500 });
  }

  return NextResponse.json({
    success: true,
    event: {
      id: calData.id,
      summary: calData.summary,
      start: calData.start?.dateTime,
      end: calData.end?.dateTime,
      htmlLink: calData.htmlLink,
    },
  });
}
