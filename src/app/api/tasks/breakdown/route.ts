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

    const { task_id, title, course_id, due_date } = await request.json();

    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: "Task title is too short to break down." }, { status: 400 });
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();

    const userLang = userProfile?.language || "en";

    // AI prompt for JSON array of subtasks
    const prompt = `Break down the student study task: "${title}" into exactly 3 smaller, highly actionable study sub-tasks (maximum 8 words each).
The target response language is '${userLang}' (e.g. if 'zh' write in Chinese, if 'tr' write in Turkish, if 'es' in Spanish, if 'en' in English).
Return ONLY a raw valid JSON array of strings. Example output format:
["First subtask details", "Second subtask details", "Third subtask details"]

Do not output markdown code fences, do not output any surrounding text. Return raw JSON text only.`;

    const aiOutput = await generateAIText(supabase, {
      prompt,
      temperature: 0.3,
      json: true,
    });

    let subtasksText: string[] = [];
    try {
      subtasksText = parseAIJson<string[]>(aiOutput);
      if (
        !Array.isArray(subtasksText) ||
        subtasksText.length === 0 ||
        subtasksText.some((item) => typeof item !== "string" || !item.trim())
      ) {
        throw new Error("Invalid task breakdown schema");
      }
    } catch (parseErr: any) {
      console.error("AI Task Breakdown output parsing error:", parseErr, "Output was:", aiOutput);

      await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: "Failed to parse AI Task Breakdown JSON",
        details: `Raw output: ${aiOutput}. Error: ${parseErr.message || String(parseErr)}`
      });

      return NextResponse.json(
        { error: "AI generated invalid JSON structure. Please try again." },
        { status: 500 }
      );
    }

    // Insert generated subtasks into tasks table
    const dbSubtasks = subtasksText.map((subTitle) => ({
      user_id: user.id,
      course_id: course_id || null,
      title: subTitle,
      due_date: due_date || null,
      priority: "low",
      status: "todo",
      parent_id: task_id,
      estimated_minutes: 15
    }));

    const { data: insertedSubtasks, error: insertError } = await supabase
      .from("tasks")
      .insert(dbSubtasks)
      .select("*");

    if (insertError) {
      console.error("Failed to insert subtasks:", insertError);
      return NextResponse.json({ error: "Failed to save subtasks." }, { status: 500 });
    }

    return NextResponse.json({ subtasks: insertedSubtasks });

  } catch (error: any) {
    console.error("Task breakdown server exception:", error);
    return NextResponse.json(
      { error: error.message || "Task breakdown failed." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
