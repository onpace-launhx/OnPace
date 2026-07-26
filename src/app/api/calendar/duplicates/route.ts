import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type DuplicatePair = {
  duplicateId: string;
  canonicalId: string;
  type: "session" | "task";
  title: string;
  canonicalTitle: string;
  reason: string;
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

function timeDistance(left?: string | null, right?: string | null) {
  if (!left || !right) return 0;
  return Math.abs(new Date(left).getTime() - new Date(right).getTime());
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sessionsResult, tasksResult, profileResult] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, title, start_time")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true })
      .limit(500),
    supabase
      .from("tasks")
      .select("id, title, due_date")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(500),
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

  const language = profileResult.data?.language || "en";
  const reason =
    language === "tr"
      ? "Başlık ve planlanan zaman aynı."
      : language === "es"
        ? "El título y la hora programada coinciden."
        : language === "zh"
          ? "标题和计划时间相同。"
          : "The title and scheduled time match.";
  const pairs: DuplicatePair[] = [];

  const canonicalSessions = new Map<string, { id: string; title: string; start_time: string | null }>();
  for (const session of sessionsResult.data || []) {
    const key = normalizeTitle(session.title);
    const canonical = canonicalSessions.get(key);
    if (
      canonical &&
      timeDistance(session.start_time, canonical.start_time) <= 6 * 60 * 60_000
    ) {
      pairs.push({
        duplicateId: session.id,
        canonicalId: canonical.id,
        type: "session",
        title: session.title,
        canonicalTitle: canonical.title,
        reason,
      });
    } else {
      canonicalSessions.set(key, session);
    }
  }

  const canonicalTasks = new Map<string, { id: string; title: string; due_date: string | null }>();
  for (const task of tasksResult.data || []) {
    const key = normalizeTitle(task.title);
    const canonical = canonicalTasks.get(key);
    if (
      canonical &&
      timeDistance(task.due_date, canonical.due_date) <= 24 * 60 * 60_000
    ) {
      pairs.push({
        duplicateId: task.id,
        canonicalId: canonical.id,
        type: "task",
        title: task.title,
        canonicalTitle: canonical.title,
        reason,
      });
    } else {
      canonicalTasks.set(key, task);
    }
  }

  return NextResponse.json({ duplicates: pairs });
}
