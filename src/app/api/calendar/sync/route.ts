import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google-auth";

const GOOGLE_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type GoogleEvent = {
  id?: string;
  status?: string;
  eventType?: string;
  summary?: string;
  description?: string;
  updated?: string;
  etag?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: {
    private?: {
      onpace_session_id?: string;
      onpace_user_id?: string;
    };
  };
};

type CalendarSession = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  duration?: number | null;
  google_event_id?: string | null;
  sync_origin?: "onpace" | "google";
  sync_status?: "local_only" | "pending_update" | "synced" | "error";
  updated_at?: string | null;
};

function googleEventTimes(event: GoogleEvent) {
  if (event.start?.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end?.dateTime || start.getTime() + 60 * 60_000);
    return {
      startTime: start.toISOString(),
      duration: Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000)),
    };
  }

  if (event.start?.date) {
    return {
      startTime: new Date(`${event.start.date}T09:00:00Z`).toISOString(),
      duration: 60,
    };
  }

  return null;
}

function localEventBody(session: CalendarSession) {
  const start = new Date(session.start_time);
  const end = new Date(start.getTime() + Math.max(15, Number(session.duration) || 60) * 60_000);
  return {
    summary: session.title,
    description: session.description || "OnPace study session",
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    extendedProperties: {
      private: {
        onpace_session_id: session.id,
        onpace_user_id: session.user_id,
      },
    },
  };
}

async function readGoogleResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Google Calendar returned ${response.status}.`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return data;
}

async function listGoogleChanges(accessToken: string, syncToken?: string | null) {
  const events: GoogleEvent[] = [];
  let pageToken: string | null = null;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({
      maxResults: "2500",
      showDeleted: "true",
      singleEvents: "true",
    });
    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);
      const until = new Date();
      until.setFullYear(until.getFullYear() + 2);
      params.set("timeMin", from.toISOString());
      params.set("timeMax", until.toISOString());
    }
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(`${GOOGLE_EVENTS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const data = await readGoogleResponse(response);
    events.push(...(data.items || []));
    pageToken = data.nextPageToken || null;
    nextSyncToken = data.nextSyncToken || nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken };
}

async function findGoogleEventForSession(accessToken: string, sessionId: string) {
  const params = new URLSearchParams({
    maxResults: "1",
    showDeleted: "false",
    privateExtendedProperty: `onpace_session_id=${sessionId}`,
  });
  const response = await fetch(`${GOOGLE_EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await readGoogleResponse(response);
  return (data.items?.[0] || null) as GoogleEvent | null;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = await getValidAccessToken(supabase, user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google Calendar permission needs to be renewed.", connected: false },
      { status: 401 }
    );
  }

  const { data: syncState } = await supabase
    .from("calendar_sync_state")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    let deleted = 0;

    // Replay deletes made while Google was disconnected before pulling remote
    // changes; otherwise a full pull could temporarily recreate those rows.
    const { data: tombstones, error: tombstoneReadError } = await supabase
      .from("calendar_sync_tombstones")
      .select("id, google_event_id, calendar_id")
      .eq("user_id", user.id);
    if (tombstoneReadError) throw new Error(tombstoneReadError.message);

    for (const tombstone of tombstones || []) {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tombstone.calendar_id || "primary")}/events/${encodeURIComponent(tombstone.google_event_id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!response.ok && response.status !== 404) {
        await readGoogleResponse(response);
      }
      const { error } = await supabase
        .from("calendar_sync_tombstones")
        .delete()
        .eq("id", tombstone.id);
      if (error) throw new Error(error.message);
      deleted += 1;
    }

    let googleResult;
    try {
      googleResult = await listGoogleChanges(accessToken, syncState?.next_sync_token);
    } catch (error) {
      if ((error as Error & { status?: number }).status !== 410) throw error;
      await supabase
        .from("calendar_sync_state")
        .upsert({ user_id: user.id, next_sync_token: null, last_error: null });
      googleResult = await listGoogleChanges(accessToken);
    }

    const { data: currentLocalRows, error: localReadError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id);
    if (localReadError) throw new Error(localReadError.message);

    const localRows = (currentLocalRows || []) as CalendarSession[];
    const localById = new Map(localRows.map((session) => [session.id, session]));
    const localByGoogleId = new Map(
      localRows
        .filter((session) => session.google_event_id)
        .map((session) => [session.google_event_id as string, session])
    );

    let pulled = 0;
    for (const event of googleResult.events) {
      if (!event.id) continue;
      const linkedLocalId = event.extendedProperties?.private?.onpace_session_id;
      const local = localByGoogleId.get(event.id) ||
        (linkedLocalId ? localById.get(linkedLocalId) : undefined);

      if (event.status === "cancelled") {
        if (local) {
          const { error } = await supabase.from("study_sessions").delete().eq("id", local.id);
          if (error) throw new Error(error.message);
          deleted += 1;
        }
        continue;
      }
      if (event.eventType && event.eventType !== "default") continue;
      const times = googleEventTimes(event);
      if (!times) continue;

      if (local) {
        const googleChangedAt = event.updated ? new Date(event.updated).getTime() : 0;
        const localChangedAt = local.updated_at ? new Date(local.updated_at).getTime() : 0;
        const localWins =
          local.sync_status === "pending_update" &&
          localChangedAt > googleChangedAt;
        if (localWins) continue;

        const { error } = await supabase
          .from("study_sessions")
          .update({
            title: event.summary || "Google Calendar event",
            start_time: times.startTime,
            duration: times.duration,
            google_event_id: event.id,
            google_calendar_id: "primary",
            google_etag: event.etag || null,
            google_updated_at: event.updated || null,
            sync_status: "synced",
            sync_error: null,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", local.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("study_sessions").insert({
          user_id: user.id,
          title: event.summary || "Google Calendar event",
          start_time: times.startTime,
          duration: times.duration,
          google_event_id: event.id,
          google_calendar_id: "primary",
          google_etag: event.etag || null,
          google_updated_at: event.updated || null,
          sync_origin: "google",
          sync_status: "synced",
          sync_error: null,
          last_synced_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
      }
      pulled += 1;
    }

    const { data: pendingRows, error: pendingReadError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", user.id)
      .in("sync_status", ["local_only", "pending_update", "error"]);
    if (pendingReadError) throw new Error(pendingReadError.message);

    let pushed = 0;
    let failed = 0;
    for (const session of pendingRows || []) {
      try {
        const existingGoogleEvent = session.google_event_id
          ? null
          : await findGoogleEventForSession(accessToken, session.id);
        const resolvedGoogleEventId =
          session.google_event_id || existingGoogleEvent?.id || null;
        const eventUrl = resolvedGoogleEventId
          ? `${GOOGLE_EVENTS_URL}/${encodeURIComponent(resolvedGoogleEventId)}`
          : GOOGLE_EVENTS_URL;
        let response = await fetch(eventUrl, {
          method: resolvedGoogleEventId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(localEventBody(session)),
        });

        if (response.status === 404 && resolvedGoogleEventId) {
          response = await fetch(GOOGLE_EVENTS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(localEventBody(session)),
          });
        }

        const event = await readGoogleResponse(response);
        const { error } = await supabase
          .from("study_sessions")
          .update({
            google_event_id: event.id,
            google_calendar_id: "primary",
            google_etag: event.etag || null,
            google_updated_at: event.updated || null,
            sync_origin: session.google_event_id ? session.sync_origin : "onpace",
            sync_status: "synced",
            sync_error: null,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", session.id);
        if (error) throw new Error(error.message);
        pushed += 1;
      } catch (error) {
        failed += 1;
        await supabase
          .from("study_sessions")
          .update({
            sync_status: "error",
            sync_error: error instanceof Error ? error.message : "Google synchronization failed.",
          })
          .eq("id", session.id);
      }
    }

    const syncTimestamp = new Date().toISOString();
    const partialFailureMessage = failed > 0
      ? `${failed} calendar event${failed === 1 ? "" : "s"} could not be synchronized.`
      : null;
    const { error: stateError } = await supabase.from("calendar_sync_state").upsert({
      user_id: user.id,
      calendar_id: "primary",
      next_sync_token: googleResult.nextSyncToken,
      last_full_sync_at: syncState?.next_sync_token
        ? syncState.last_full_sync_at
        : syncTimestamp,
      last_sync_at: syncTimestamp,
      last_error: partialFailureMessage,
      updated_at: syncTimestamp,
    });
    if (stateError) throw new Error(stateError.message);

    if (failed > 0) {
      return NextResponse.json({
        success: false,
        connected: true,
        pulled,
        pushed,
        deleted,
        failed,
        lastSyncAt: syncTimestamp,
        error: partialFailureMessage,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      connected: true,
      pulled,
      pushed,
      deleted,
      failed,
      lastSyncAt: syncTimestamp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar synchronization failed.";
    await supabase.from("calendar_sync_state").upsert({
      user_id: user.id,
      calendar_id: "primary",
      last_error: message,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ error: message, connected: true }, { status: 502 });
  }
}
