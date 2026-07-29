import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";
import { getStudentLearningContext } from "@/lib/ai/student-context";
import { languageName, localized, normalizeLanguage } from "@/lib/i18n";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const taskId = body.task_id || body.taskId;

    if (!taskId) {
      return NextResponse.json({ error: "Task id is required." }, { status: 400 });
    }

    const { data: parentTask, error: parentTaskError } = await supabase
      .from("tasks")
      .select("id, title, course_id, due_date")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (parentTaskError || !parentTask) {
      return NextResponse.json({ error: "Task was not found." }, { status: 404 });
    }

    const title = parentTask.title;
    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: "Task title is too short to break down." }, { status: 400 });
    }

    const context = await getStudentLearningContext(supabase, user.id);
    const userLang = normalizeLanguage(context.profile?.language);
    const copy = localized(userLang, {
      en: {
        invalid: "AI returned an invalid task breakdown. Please try again.",
        save: "The generated subtasks could not be saved.",
        failed: "AI could not break down this task. Please try again.",
      },
      tr: {
        invalid: "AI geçerli bir alt görev planı oluşturamadı. Lütfen tekrar dene.",
        save: "Oluşturulan alt görevler kaydedilemedi.",
        failed: "AI bu görevi alt adımlara bölemedi. Lütfen tekrar dene.",
      },
      es: {
        invalid: "La IA devolvió una división de tarea no válida. Inténtalo de nuevo.",
        save: "No se pudieron guardar las subtareas generadas.",
        failed: "La IA no pudo dividir esta tarea. Inténtalo de nuevo.",
      },
      zh: {
        invalid: "AI 返回的任务拆分无效，请重试。",
        save: "无法保存生成的子任务。",
        failed: "AI 无法拆分此任务，请重试。",
      },
    });

    const { data: existingSubtasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("parent_id", parentTask.id)
      .order("created_at", { ascending: true });
    if (existingSubtasks && existingSubtasks.length > 0) {
      return NextResponse.json({ subtasks: existingSubtasks, reused: true });
    }

    // AI prompt for JSON array of subtasks
    const prompt = `Break down the student study task: "${title}" into exactly 3 smaller, highly actionable study sub-tasks (maximum 8 words each).
Write every subtask naturally in ${languageName(userLang)}. Preserve course names and the student's original writing system. Do not switch languages.
Student courses: ${JSON.stringify(context.courses)}. Upcoming exams: ${JSON.stringify(context.upcomingExams)}. Other open tasks: ${JSON.stringify(context.openTasks.filter((task) => task.title !== title).slice(0, 8))}.
Avoid duplicating tasks and suggest the smallest next actions that fit the student's actual workload.
Return ONLY a raw valid JSON array of strings. Example output format:
["First subtask details", "Second subtask details", "Third subtask details"]

Do not output markdown code fences, do not output any surrounding text. Return raw JSON text only.`;

    let subtasksText: string[] = [];
    let lastAiOutput = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      lastAiOutput = await generateAIText(supabase, {
        prompt,
        temperature: attempt === 0 ? 0.25 : 0.05,
        json: true,
      });
      try {
        const parsed = parseAIJson<string[]>(lastAiOutput);
        const normalized = Array.isArray(parsed)
          ? Array.from(
              new Set(
                parsed
                  .filter((item): item is string => typeof item === "string")
                  .map((item) => item.trim())
                  .filter((item) => item.length > 0 && item.length <= 160)
              )
            )
          : [];
        if (normalized.length !== 3) {
          throw new Error("Expected exactly three unique subtasks");
        }
        subtasksText = normalized;
        break;
      } catch (parseError) {
        console.error("AI Task Breakdown validation failed:", parseError);
      }
    }

    if (subtasksText.length !== 3) {
      await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: "Failed to parse AI Task Breakdown JSON",
        details: `Raw output after retry: ${lastAiOutput}`
      });

      return NextResponse.json(
        { error: copy.invalid },
        { status: 500 }
      );
    }

    // Insert generated subtasks into tasks table
    const dbSubtasks = subtasksText.map((subTitle) => ({
      user_id: user.id,
      course_id: parentTask.course_id || null,
      title: subTitle,
      due_date: parentTask.due_date || null,
      priority: "low",
      status: "todo",
      parent_id: parentTask.id,
      task_origin: "ai_breakdown",
      estimated_minutes: 15
    }));

    const { data: insertedSubtasks, error: insertError } = await supabase
      .from("tasks")
      .insert(dbSubtasks)
      .select("*");

    if (insertError) {
      console.error("Failed to insert subtasks:", insertError);
      return NextResponse.json(
        { error: copy.save, details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ subtasks: insertedSubtasks });

  } catch (error: any) {
    console.error("Task breakdown server exception:", error);
    return NextResponse.json(
      { error: "Task breakdown failed.", code: "BREAKDOWN_FAILED" },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
