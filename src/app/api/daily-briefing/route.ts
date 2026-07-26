import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupportedLanguage = "en" | "tr" | "es" | "zh";

const copy: Record<SupportedLanguage, {
  title: string;
  empty: string;
  summary: (tasks: number, sessions: number, remaining: number) => string;
}> = {
  en: {
    title: "Your plan for today",
    empty: "Your calendar is clear today. Add a focused study block when you are ready.",
    summary: (tasks, sessions, remaining) => `${tasks} open task${tasks === 1 ? "" : "s"}, ${sessions} calendar block${sessions === 1 ? "" : "s"}, and ${remaining} minutes left toward your focus goal.`,
  },
  tr: {
    title: "Bugünkü planın",
    empty: "Bugün takvimin açık. Hazır olduğunda odaklı bir çalışma bloğu ekleyebilirsin.",
    summary: (tasks, sessions, remaining) => `${tasks} açık görev, ${sessions} takvim bloğu ve odak hedefine ulaşmak için ${remaining} dakika kaldı.`,
  },
  es: {
    title: "Tu plan de hoy",
    empty: "Tu calendario está libre hoy. Añade un bloque de estudio cuando estés listo.",
    summary: (tasks, sessions, remaining) => `${tasks} tarea${tasks === 1 ? "" : "s"} pendiente${tasks === 1 ? "" : "s"}, ${sessions} bloque${sessions === 1 ? "" : "s"} de calendario y ${remaining} minutos para tu objetivo de enfoque.`,
  },
  zh: {
    title: "今日学习计划",
    empty: "你今天的日历是空的。准备好后可以添加一个专注学习时段。",
    summary: (tasks, sessions, remaining) => `你有 ${tasks} 项未完成任务、${sessions} 个日历时段，距离今日专注目标还差 ${remaining} 分钟。`,
  },
};

function localDateFromRequest(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const briefingDate = localDateFromRequest(body?.date);
  const { data: existing } = await supabase
    .from("daily_briefings")
    .select("notification_id")
    .eq("user_id", user.id)
    .eq("briefing_date", briefingDate)
    .maybeSingle();
  if (existing) return NextResponse.json({ created: false, notificationId: existing.notification_id });

  const start = new Date(`${briefingDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const [{ data: profile }, { count: taskCount }, { count: sessionCount }, { data: focusSessions }] = await Promise.all([
    supabase.from("profiles").select("language, daily_study_goal_minutes").eq("id", user.id).maybeSingle(),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "completed"),
    supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("start_time", start.toISOString()).lt("start_time", end.toISOString()),
    supabase.from("focus_sessions").select("duration_seconds").eq("user_id", user.id).eq("mode", "study").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()),
  ]);

  const language: SupportedLanguage = ["en", "tr", "es", "zh"].includes(profile?.language || "")
    ? profile!.language as SupportedLanguage
    : "en";
  const goal = Number(profile?.daily_study_goal_minutes || 60);
  const completedMinutes = Math.floor((focusSessions || []).reduce((total, session) => total + Number(session.duration_seconds || 0), 0) / 60);
  const remaining = Math.max(0, goal - completedMinutes);
  const text = copy[language];
  const content = (taskCount || 0) + (sessionCount || 0) > 0
    ? text.summary(taskCount || 0, sessionCount || 0, remaining)
    : text.empty;

  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .insert({ user_id: user.id, title: text.title, content, type: "daily_briefing" })
    .select("id")
    .single();
  if (notificationError) return NextResponse.json({ error: notificationError.message }, { status: 500 });

  const { error: briefingError } = await supabase
    .from("daily_briefings")
    .insert({ user_id: user.id, briefing_date: briefingDate, notification_id: notification.id });
  if (briefingError) {
    await supabase.from("notifications").delete().eq("id", notification.id);
    return NextResponse.json({ created: false, reason: "already-created" });
  }

  return NextResponse.json({ created: true, notificationId: notification.id });
}
