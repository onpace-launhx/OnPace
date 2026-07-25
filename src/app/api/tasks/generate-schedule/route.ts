import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";
import { getStudentLearningContext } from "@/lib/ai/student-context";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { language } = await request.json();
    const context = await getStudentLearningContext(supabase, user.id);
    const lang = context.profile?.language || language || "en";

    // Build course context
    const courseContext = context.courses.length > 0
      ? `The student is taking the following courses: ${context.courses.join(", ")}.`
      : "The student has not listed specific courses.";
    const taskContext = context.openTasks.length > 0
      ? `Existing incomplete tasks (do not duplicate these; break them into the next concrete action instead): ${JSON.stringify(context.openTasks.slice(0, 12))}`
      : "There are no existing tasks yet, so suggest useful foundational actions.";
    const goalContext = `Daily focus target: ${context.profile?.daily_study_goal_minutes || 60} minutes. Focus achieved in the last 7 days: ${context.focusMinutesLast7Days} minutes across ${context.focusSessionCountLast7Days} sessions. Upcoming exams: ${JSON.stringify(context.upcomingExams)}.`;

    const prompt = `Based on the student's background:
${courseContext}
${taskContext}
${goalContext}

Generate exactly 3 highly actionable, micro study-tasks for today (maximum 8 words each).
Prioritize the nearest due work and fit the remaining daily focus time. Tailor the tasks to their courses if specified.
The tasks MUST be in this language: "${lang === "tr" ? "Turkish" : lang === "es" ? "Spanish" : lang === "zh" ? "Chinese" : "English"}".

Return ONLY a raw valid JSON array of strings. Example format:
["First generated task details", "Second generated task details", "Third generated task details"]

Do not output markdown code fences, do not output any surrounding explanation. Return raw JSON text only.`;

    const aiOutput = await generateAIText(supabase, {
      prompt,
      temperature: 0.5,
      json: true,
    });

    let generatedTasks: string[] = [];
    try {
      generatedTasks = parseAIJson<string[]>(aiOutput);
      if (
        !Array.isArray(generatedTasks) ||
        generatedTasks.length === 0 ||
        generatedTasks.some((item) => typeof item !== "string" || !item.trim())
      ) {
        throw new Error("Invalid generated tasks schema");
      }
    } catch (parseErr) {
      console.error("AI Schedule Generator parsing error:", parseErr, "Output was:", aiOutput);
      return NextResponse.json({ error: "AI output parsing failed." }, { status: 500 });
    }

    return NextResponse.json({ tasks: generatedTasks });

  } catch (error: any) {
    console.error("Schedule generator server exception:", error);
    return NextResponse.json(
      { error: error.message || "Schedule generation failed." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
