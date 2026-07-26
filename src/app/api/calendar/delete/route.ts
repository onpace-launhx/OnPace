import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google-auth";

export async function DELETE(request: NextRequest) {
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

  const { eventId: requestedEventId, localSessionId } = await request.json();
  let eventId = typeof requestedEventId === "string" ? requestedEventId : "";
  const resolvedLocalSessionId =
    typeof localSessionId === "string" ? localSessionId : "";

  if (resolvedLocalSessionId) {
    const { data: localSession, error } = await supabase
      .from("study_sessions")
      .select("id, google_event_id")
      .eq("id", resolvedLocalSessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    eventId = localSession?.google_event_id || eventId;
  }

  if (!eventId && !resolvedLocalSessionId) {
    return NextResponse.json(
      { error: "eventId or localSessionId is required" },
      { status: 400 }
    );
  }

  if (eventId) {
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!calRes.ok && calRes.status !== 204 && calRes.status !== 404) {
      const errorData = await calRes.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.error?.message || "Failed to delete event" },
        { status: calRes.status || 500 }
      );
    }
  }

  if (resolvedLocalSessionId) {
    const { error } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", resolvedLocalSessionId)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
