import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courses, language } = await request.json();
    const lang = language || "en";

    // Build course context
    const courseContext = Array.isArray(courses) && courses.length > 0 
      ? `The student is taking the following courses: ${courses.join(", ")}.`
      : "The student has not listed specific courses.";

    const prompt = `Based on the student's background:
${courseContext}

Generate exactly 3 highly actionable, micro study-tasks for today (maximum 8 words each).
Tailor the tasks to their courses if specified.
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
