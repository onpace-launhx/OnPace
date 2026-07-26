import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIText, parseAIJson } from "@/lib/ai/server";

type IncomingItem = {
  key: string;
  type: "session" | "task";
  title: string;
  at: string | null;
  duration: number | null;
};

type ExistingItem = IncomingItem & {
  id: string;
};

type DuplicateConflict = {
  incomingKey: string;
  existingId: string;
  existingType: "session" | "task" | "incoming";
  existingTitle: string;
  reason: string;
  confidence: number;
};

function normalizeTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function closeInTime(left: string | null, right: string | null) {
  if (!left || !right) return true;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return true;
  return Math.abs(leftTime - rightTime) <= 6 * 60 * 60_000;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const incoming = (Array.isArray(body?.items) ? body.items : [])
    .slice(0, 40)
    .map((item: Partial<IncomingItem>, index: number): IncomingItem => ({
      key: typeof item.key === "string" ? item.key : `item:${index}`,
      type: item.type === "task" ? "task" : "session",
      title: String(item.title || "").trim().slice(0, 240),
      at: typeof item.at === "string" ? item.at : null,
      duration: Number.isFinite(Number(item.duration))
        ? Number(item.duration)
        : null,
    }))
    .filter((item: IncomingItem) => item.title.length > 0);

  if (incoming.length === 0) {
    return NextResponse.json({ conflicts: [] });
  }

  const earliest = incoming
    .map((item: IncomingItem) => item.at)
    .filter((value: string | null): value is string => Boolean(value))
    .sort()[0];
  const rangeStart = earliest
    ? new Date(new Date(earliest).getTime() - 14 * 24 * 60 * 60_000).toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();

  const [sessionsResult, tasksResult, profileResult] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, title, start_time, duration")
      .eq("user_id", user.id)
      .gte("start_time", rangeStart)
      .limit(200),
    supabase
      .from("tasks")
      .select("id, title, due_date, estimated_minutes")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .limit(200),
    supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (sessionsResult.error) {
    return NextResponse.json({ error: sessionsResult.error.message }, { status: 400 });
  }
  if (tasksResult.error) {
    return NextResponse.json({ error: tasksResult.error.message }, { status: 400 });
  }

  const existing: ExistingItem[] = [
    ...(sessionsResult.data || []).map((item) => ({
      id: item.id,
      key: `session:${item.id}`,
      type: "session" as const,
      title: item.title,
      at: item.start_time,
      duration: Number(item.duration) || 60,
    })),
    ...(tasksResult.data || []).map((item) => ({
      id: item.id,
      key: `task:${item.id}`,
      type: "task" as const,
      title: item.title,
      at: item.due_date,
      duration: Number(item.estimated_minutes) || 30,
    })),
  ];

  const conflicts = new Map<string, DuplicateConflict>();
  const comparisonPool: ExistingItem[] = [...existing];
  for (const item of incoming) {
    const normalized = normalizeTitle(item.title);
    const match = comparisonPool.find(
      (candidate) =>
        normalizeTitle(candidate.title) === normalized &&
        closeInTime(item.at, candidate.at)
    );
    if (match) {
      conflicts.set(item.key, {
        incomingKey: item.key,
        existingId: match.id,
        existingType: match.id.startsWith("incoming:")
          ? "incoming"
          : match.type,
        existingTitle: match.title,
        reason: "The title and scheduled time match an existing item.",
        confidence: 1,
      });
    } else {
      comparisonPool.push({
        ...item,
        id: `incoming:${item.key}`,
      });
    }
  }

  const unresolved = incoming.filter((item: IncomingItem) => !conflicts.has(item.key));
  if (unresolved.length > 0 && existing.length > 0) {
    try {
      const language = profileResult.data?.language || "en";
      const raw = await generateAIText(supabase, {
        prompt: `You detect semantically duplicate student tasks and calendar events.
Response language for each reason: ${language}.
Incoming items: ${JSON.stringify(unresolved)}
Existing items: ${JSON.stringify(existing.slice(0, 200))}

Only mark an item as duplicate when both describe the same real activity, class, exam, or task. Similar subjects alone are not duplicates. Consider title meaning, date/time, and duration.
Return ONLY JSON:
{"conflicts":[{"incomingKey":"session:0","existingId":"uuid","existingType":"session","existingTitle":"title","reason":"short localized reason","confidence":0.92}]}
Confidence must be between 0 and 1. Do not return conflicts below 0.78.`,
        temperature: 0.1,
        json: true,
      });
      const aiResult = parseAIJson<{ conflicts?: DuplicateConflict[] }>(raw);
      for (const conflict of aiResult.conflicts || []) {
        const validIncoming = unresolved.some(
          (item: IncomingItem) => item.key === conflict.incomingKey
        );
        const validExisting = existing.some(
          (item) => item.id === conflict.existingId
        );
        const confidence = Number(conflict.confidence);
        if (
          validIncoming &&
          validExisting &&
          Number.isFinite(confidence) &&
          confidence >= 0.78
        ) {
          conflicts.set(conflict.incomingKey, {
            ...conflict,
            existingType: conflict.existingType === "task" ? "task" : "session",
            confidence: Math.min(1, confidence),
          });
        }
      }
    } catch (error) {
      console.warn("AI duplicate analysis unavailable; deterministic checks were used.", error);
    }
  }

  return NextResponse.json({ conflicts: [...conflicts.values()] });
}
