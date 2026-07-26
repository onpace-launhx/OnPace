import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A privacy-scoped view of the student's own learning data.
 * AI routes use this instead of independently inventing context per feature.
 */
export async function getStudentLearningContext(supabase: SupabaseClient, userId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [profileResult, coursesResult, tasksResult, notesResult, sessionsResult, focusResult, examsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, language, learning_styles, customization_settings, daily_study_goal_minutes").eq("id", userId).maybeSingle(),
    supabase.from("courses").select("name").eq("user_id", userId).limit(20),
    supabase.from("tasks").select("title, priority, due_date, estimated_minutes").eq("user_id", userId).neq("status", "completed").order("due_date", { ascending: true, nullsFirst: false }).limit(20),
    supabase.from("notes").select("title, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(10),
    supabase.from("study_sessions").select("title, start_time, duration").eq("user_id", userId).gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }).limit(20),
    supabase.from("focus_sessions").select("duration_seconds, completed").eq("user_id", userId).eq("mode", "study").gte("created_at", sevenDaysAgo.toISOString()).limit(100),
    supabase.from("exam_roadmaps").select("title, exam_date").eq("user_id", userId).order("exam_date", { ascending: true }).limit(10),
  ]);

  const focusMinutesLast7Days = Math.floor((focusResult.data || []).reduce((total, item) => total + Number(item.duration_seconds || 0), 0) / 60);
  return {
    profile: profileResult.data || null,
    courses: (coursesResult.data || []).map((course) => course.name),
    openTasks: tasksResult.data || [],
    recentNotes: notesResult.data || [],
    upcomingSessions: sessionsResult.data || [],
    focusMinutesLast7Days,
    focusSessionCountLast7Days: focusResult.data?.length || 0,
    upcomingExams: examsResult.data || [],
  };
}
