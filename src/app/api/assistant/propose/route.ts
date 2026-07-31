import { NextResponse } from "next/server";
import { generateAIText, parseAIJson } from "@/lib/ai/server";
import { createClient } from "@/lib/supabase/server";

type ParsedAction = {
  kind?: "calendar_create" | "task_create" | "none";
  title?: string;
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  priority?: "low" | "medium" | "high";
};

type StoredSession = {
  title: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function zonedDateTimeToIso(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(naiveUtc));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  const renderedUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second")
  );
  return new Date(naiveUtc - (renderedUtc - naiveUtc)).toISOString();
}

function getEndTime(session: StoredSession) {
  if (session.end_time) return new Date(session.end_time);
  return new Date(
    new Date(session.start_time).getTime() +
      Math.max(15, Number(session.duration) || 60) * 60_000
  );
}

function overlaps(start: Date, end: Date, session: StoredSession) {
  const existingStart = new Date(session.start_time);
  const existingEnd = getEndTime(session);
  return existingStart < end && existingEnd > start;
}

function findAlternative(
  start: Date,
  durationMinutes: number,
  sessions: StoredSession[]
) {
  const durationMs = durationMinutes * 60_000;
  let candidate = new Date(start);

  for (let attempt = 0; attempt < 96; attempt += 1) {
    const candidateEnd = new Date(candidate.getTime() + durationMs);
    const conflicts = sessions.filter((session) =>
      overlaps(candidate, candidateEnd, session)
    );
    if (conflicts.length === 0) return candidate;

    const latestEnd = Math.max(
      ...conflicts.map((session) => getEndTime(session).getTime())
    );
    candidate = new Date(Math.ceil(latestEnd / 900_000) * 900_000);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const today = typeof body?.today === "string" ? body.today : "";
    const timeZone =
      typeof body?.timeZone === "string" && body.timeZone.length <= 100
        ? body.timeZone
        : "UTC";
    const language = typeof body?.language === "string" ? body.language : "en";

    if (!message || !DATE_PATTERN.test(today)) {
      return NextResponse.json({ proposal: null });
    }

    const raw = await generateAIText(supabase, {
      workload: "reasoning",
      json: true,
      temperature: 0.1,
      systemInstruction: `You extract a single actionable request from a student's message. The interface language is ${language}. Today is ${today} in timezone ${timeZone}.
Return JSON only with this schema: {"kind":"calendar_create"|"task_create"|"none","title":string,"date":"YYYY-MM-DD","startTime":"HH:MM","durationMinutes":number,"priority":"low"|"medium"|"high"}.
Use calendar_create only when the student clearly wants to add or schedule a calendar/study session. Resolve relative dates using today. Use task_create only when the student clearly wants a new task. For a calendar request without a clear date or time, return calendar_create but omit the unknown field. Never invent an event title, date, or time.`,
      prompt: message,
    });
    const action = parseAIJson<ParsedAction>(raw);
    const title = typeof action.title === "string" ? action.title.trim().slice(0, 180) : "";

    if (!action.kind || action.kind === "none" || !title) {
      return NextResponse.json({ proposal: null });
    }

    if (action.kind === "task_create") {
      return NextResponse.json({
        proposal: {
          type: "task",
          title,
          priority: action.priority || "medium",
          requiresConfirmation: true,
        },
      });
    }

    const date = typeof action.date === "string" ? action.date : "";
    const startTime = typeof action.startTime === "string" ? action.startTime : "";
    if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(startTime)) {
      return NextResponse.json({
        proposal: null,
        followUp:
          language === "tr"
            ? "Takvime eklemem için başlıkla birlikte gün ve saatini de yazar mısın?"
            : "Please tell me the date and time so I can prepare the calendar entry.",
      });
    }

    const durationMinutes = Math.min(
      480,
      Math.max(15, Number(action.durationMinutes) || 60)
    );
    const start = zonedDateTimeToIso(date, startTime, timeZone);
    const end = new Date(
      new Date(start).getTime() + durationMinutes * 60_000
    ).toISOString();
    const rangeStart = new Date(new Date(start).getTime() - 24 * 60 * 60_000).toISOString();
    const rangeEnd = new Date(new Date(start).getTime() + 48 * 60 * 60_000).toISOString();
    const { data: rows, error } = await supabase
      .from("study_sessions")
      .select("title, start_time, end_time, duration")
      .eq("user_id", user.id)
      .gte("start_time", rangeStart)
      .lt("start_time", rangeEnd);
    if (error) throw new Error(error.message);

    const sessions = (rows || []) as StoredSession[];
    const conflicts = sessions.filter((session) =>
      overlaps(new Date(start), new Date(end), session)
    );
    const alternativeStart = conflicts.length
      ? findAlternative(new Date(start), durationMinutes, sessions)
      : null;

    return NextResponse.json({
      proposal: {
        type: "calendar",
        title,
        startTime: start,
        endTime: end,
        durationMinutes,
        requiresConfirmation: true,
        conflict:
          conflicts.length > 0
            ? {
                events: conflicts.map((session) => ({
                  title: session.title,
                  startTime: session.start_time,
                  endTime: getEndTime(session).toISOString(),
                })),
                alternativeStart: alternativeStart?.toISOString() || null,
                alternativeEnd: alternativeStart
                  ? new Date(
                      alternativeStart.getTime() + durationMinutes * 60_000
                    ).toISOString()
                  : null,
              }
            : null,
      },
    });
  } catch (error) {
    console.error("Assistant proposal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare an action." },
      { status: 500 }
    );
  }
}
