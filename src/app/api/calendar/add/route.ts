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

  const { summary, start, end, description } = await request.json();

  if (!summary || !start || !end) {
    return NextResponse.json(
      { error: "summary, start, and end are required" },
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
        summary,
        description: description || "",
        start: { dateTime: start, timeZone: "UTC" },
        end: { dateTime: end, timeZone: "UTC" },
      }),
    }
  );

  const calData = await calRes.json();

  if (!calData.id) {
    console.error("Failed to create event:", calData);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
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
