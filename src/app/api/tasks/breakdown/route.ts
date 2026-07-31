import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";
import { getStudentLearningContext } from "@/lib/ai/student-context";
import {
  languageName,
  localized,
  normalizeLanguage,
  supportedLanguages,
  type SupportedLanguage,
} from "@/lib/i18n";

type BreakdownResponse = {
  language?: unknown;
  subtasks?: unknown;
};

function hasEnoughTitleContent(value: string) {
  const compact = value.trim().replace(/\s+/gu, "");
  const cjkCharacters = compact.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/gu) || [];
  return cjkCharacters.length >= 2 || Array.from(compact).length >= 3;
}

function matchesRequestedLanguage(
  subtasks: string[],
  language: SupportedLanguage
) {
  const combined = subtasks.join(" ");
  const hasHanCharacters = /[\u3400-\u9fff]/u.test(combined);

  if (language === "zh") {
    return subtasks.every((subtask) => /[\u3400-\u9fff]/u.test(subtask));
  }

  if (hasHanCharacters) return false;
  if (language === "en" && /[çğıöşüñáéíóú¿¡]/iu.test(combined)) return false;
  if (language === "es" && /[çğıöş]/iu.test(combined)) return false;

  return true;
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

    const body = await request.json();
    const taskId = body.task_id || body.taskId;
    const requestedLanguage =
      typeof body.language === "string" &&
      supportedLanguages.includes(body.language as SupportedLanguage)
        ? (body.language as SupportedLanguage)
        : null;
    const regenerate = body.regenerate === true;

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
    if (!title || !hasEnoughTitleContent(title)) {
      return NextResponse.json({ error: "Task title is too short to break down." }, { status: 400 });
    }

    const context = await getStudentLearningContext(supabase, user.id);
    const userLang = requestedLanguage || normalizeLanguage(context.profile?.language);
    const outputLanguage = languageName(userLang);
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
    if (existingSubtasks && existingSubtasks.length > 0 && !regenerate) {
      return NextResponse.json({ subtasks: existingSubtasks, reused: true });
    }

    const existingSubtaskTitles = new Set(
      (existingSubtasks || []).map((subtask) => subtask.title)
    );
    const otherOpenTasks = context.openTasks
      .filter(
        (task) =>
          task.title !== title && !existingSubtaskTitles.has(task.title)
      )
      .slice(0, 8);

    // The interface language is the source of truth even when task or course
    // context contains text written in another language.
    const prompt = `Break down the student study task: "${title}" into exactly 3 smaller, highly actionable study sub-tasks (maximum 8 words each).
The required output language is ${outputLanguage}.
Write every generated subtask in ${outputLanguage}, regardless of the language used by the task title or surrounding context.
Only proper nouns, official course names, and acronyms may remain unchanged. Do not mix languages.
Student courses: ${JSON.stringify(context.courses)}. Upcoming exams: ${JSON.stringify(context.upcomingExams)}. Other open tasks: ${JSON.stringify(otherOpenTasks)}.
Avoid duplicating tasks and suggest the smallest next actions that fit the student's actual workload.
Return ONLY a raw valid JSON object in this exact shape:
{"language":"${userLang}","subtasks":["...", "...", "..."]}

Do not output markdown code fences, do not output any surrounding text. Return raw JSON text only.`;

    let subtasksText: string[] = [];
    let lastAiOutput = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      lastAiOutput = await generateAIText(supabase, {
        prompt,
        systemInstruction: `You write localized study content. The current OnPace interface language is ${outputLanguage}. All user-facing generated text must be exclusively in ${outputLanguage}, except proper nouns and acronyms. Never infer the response language from the input text.`,
        temperature: attempt === 0 ? 0.25 : 0.05,
        json: true,
      });
      try {
        const parsed = parseAIJson<BreakdownResponse>(lastAiOutput);
        const normalized = Array.isArray(parsed?.subtasks)
          ? Array.from(
              new Set(
                parsed.subtasks
                  .filter((item): item is string => typeof item === "string")
                  .map((item) => item.trim())
                  .filter((item) => item.length > 0 && item.length <= 160)
              )
            )
          : [];
        if (
          parsed?.language !== userLang ||
          normalized.length !== 3 ||
          !matchesRequestedLanguage(normalized, userLang)
        ) {
          throw new Error("Expected three unique subtasks in the requested language");
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

    if (regenerate && existingSubtasks && existingSubtasks.length > 0) {
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("user_id", user.id)
        .eq("parent_id", parentTask.id);

      if (deleteError) {
        console.error("Failed to replace existing subtasks:", deleteError);
        return NextResponse.json({ error: copy.save }, { status: 500 });
      }
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

  } catch (error: unknown) {
    console.error("Task breakdown server exception:", error);
    return NextResponse.json(
      { error: "Task breakdown failed.", code: "BREAKDOWN_FAILED" },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
