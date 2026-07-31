import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIServiceError, generateAIText, parseAIJson } from "@/lib/ai/server";
import { getStudentLearningContext } from "@/lib/ai/student-context";
import { languageName, normalizeLanguage } from "@/lib/i18n";

type ExamDraft = {
  title: string;
  topics: Array<{ title: string; importance: 1 | 2 | 3; estimated_minutes: number }>;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 1_000) : "";
    const examDate = typeof body.examDate === "string" ? body.examDate : "";
    const language = body.language === "tr" || body.language === "es" || body.language === "zh" ? body.language : "en";
    if (!description || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return NextResponse.json({ error: "Exam description and date are required." }, { status: 400 });
    }

    const outputLanguage = languageName(normalizeLanguage(language));
    const context = await getStudentLearningContext(supabase, user.id);
    const raw = await generateAIText(supabase, {
      workload: "reasoning",
      temperature: 0.2,
      json: true,
      systemInstruction: `The current OnPace interface language is ${outputLanguage}. Write every generated exam title and study topic exclusively in ${outputLanguage}, except proper nouns and official course codes.`,
      prompt: `Create an exam-study roadmap draft from this student description: ${description}\nExam date: ${examDate}\nStudent courses: ${JSON.stringify(context.courses)}\nOpen tasks: ${JSON.stringify(context.openTasks)}\nRecent note titles: ${JSON.stringify(context.recentNotes.map((note) => note.title))}\nDaily focus goal: ${context.profile?.daily_study_goal_minutes || 60} minutes.\nReturn the title and 6 to 12 distinct study topics. Use ${outputLanguage} exclusively, even if the source context is written in another language. Estimate realistic minutes per topic (15 to 360) and importance 1 (low), 2 (medium), or 3 (high). Do not duplicate topics already clearly covered by open tasks or note titles.\nReturn ONLY JSON in this exact shape:\n{"title":"exam title","topics":[{"title":"topic","importance":3,"estimated_minutes":90}]}`,
    });
    const draft = parseAIJson<ExamDraft>(raw);
    if (!draft?.title || !Array.isArray(draft.topics) || draft.topics.length < 1) {
      throw new AIServiceError("AI returned an invalid exam roadmap.", 502);
    }
    return NextResponse.json({
      title: draft.title.slice(0, 160),
      topics: draft.topics.slice(0, 12).filter((topic) => typeof topic?.title === "string" && topic.title.trim()).map((topic) => ({
        title: topic.title.trim().slice(0, 180),
        importance: Math.max(1, Math.min(3, Number(topic.importance) || 2)),
        estimated_minutes: Math.max(15, Math.min(360, Number(topic.estimated_minutes) || 60)),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create an exam draft." }, { status: error instanceof AIServiceError ? error.status : 500 });
  }
}
