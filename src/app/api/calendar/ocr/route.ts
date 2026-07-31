import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";
import { languageName, localized, normalizeLanguage } from "@/lib/i18n";

type OcrEvent = {
  title: string;
  dayOfWeek: number | null;
  dateStr: string | null;
  startTime: string;
  durationMinutes: number;
  type: "session" | "task";
  confidence: number;
  sourceText?: string;
};

const genericTitlePattern =
  /^(session|class|lesson|task|event|study|meeting|oturum|ders|görev|etkinlik|sesión|clase|tarea|evento|课程|课时|任务|活动)\s*\d*$/iu;

function normalizeOcrEvent(value: unknown): OcrEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const startTime =
    typeof item.startTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime)
      ? item.startTime
      : "09:00";
  const dateStr =
    typeof item.dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.dateStr)
      ? item.dateStr
      : null;
  const dayOfWeek =
    Number.isInteger(item.dayOfWeek) &&
    Number(item.dayOfWeek) >= 0 &&
    Number(item.dayOfWeek) <= 6
      ? Number(item.dayOfWeek)
      : null;
  const durationMinutes = Math.min(
    480,
    Math.max(10, Number(item.durationMinutes) || 60)
  );
  const confidence = Math.min(1, Math.max(0, Number(item.confidence) || 0));
  const type = item.type === "task" ? "task" : "session";

  if (
    title.length < 2 ||
    title.length > 160 ||
    genericTitlePattern.test(title) ||
    confidence < 0.45
  ) {
    return null;
  }

  return {
    title,
    dayOfWeek,
    dateStr,
    startTime,
    durationMinutes,
    type,
    confidence,
    sourceText:
      typeof item.sourceText === "string"
        ? item.sourceText.trim().slice(0, 300)
        : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }
    if (
      typeof imageBase64 !== "string" ||
      imageBase64.length > 8_500_000
    ) {
      return NextResponse.json(
        { error: "The image is too large. Use an image smaller than 6 MB." },
        { status: 413 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();
    const userLanguage = normalizeLanguage(profile?.language);
    const copy = localized(userLanguage, {
      en: {
        noReliable: "No reliable schedule items were found. Try a clearer image or edit the source before uploading again.",
      },
      tr: {
        noReliable: "Görselde güvenilir bir program öğesi bulunamadı. Daha net bir görsel kullan veya kaynağı düzenleyip tekrar yükle.",
      },
      es: {
        noReliable: "No se encontraron elementos fiables. Prueba con una imagen más clara o edita la fuente antes de subirla de nuevo.",
      },
      zh: {
        noReliable: "未识别到可靠的日程项目，请使用更清晰的图片或整理原图后重试。",
      },
    });

    const prompt = `You are an expert AI schedule and syllabus OCR parser for students.
Analyze this image of a study schedule, routine, class timetable, or to-do list screenshot.
Extract all study sessions, classes, exams, or task items.
The user's interface language is ${languageName(userLanguage)}, but OCR accuracy is more important than translation.
PRESERVE the original title text and original writing system exactly as it appears in the image. Never replace an unreadable title with generic labels such as "Session 1", "Class 1", "Task 1", or translations of those labels.
If a title is uncertain, include the best literal source text and lower the confidence. Do not invent a course name.

Return ONLY a valid JSON array of objects with the following schema:
[
  {
    "title": "Short descriptive title of course, subject or task",
    "dayOfWeek": 1, // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday (or null if specific date given)
    "dateStr": "YYYY-MM-DD", // String YYYY-MM-DD if explicit date is in image, else null
    "startTime": "09:00", // HH:mm format 24-hour
    "durationMinutes": 60, // Number in minutes
    "type": "session", // "session" for calendar event/class, "task" for to-do item
    "confidence": 0.93, // number from 0 to 1
    "sourceText": "Exact visible text used for the title"
  }
]

If the image is not legible or has no schedule information, return an empty array [].
Do NOT wrap in markdown backticks or explanation text, ONLY return the raw JSON array.`;

    const rawText = await generateAIText(supabase, {
      workload: "reasoning",
      prompt,
      temperature: 0.1,
      json: true,
      image: {
        base64: imageBase64,
        mimeType: mimeType || "image/png",
      },
    });

    let parsedEvents: unknown[] = [];
    try {
      parsedEvents = parseAIJson<unknown[]>(rawText);
      if (!Array.isArray(parsedEvents)) {
        throw new Error("Invalid calendar event schema");
      }
    } catch {
      parsedEvents = [];
    }

    const events = parsedEvents
      .map(normalizeOcrEvent)
      .filter((event): event is OcrEvent => event !== null)
      .slice(0, 50);

    if (events.length === 0) {
      return NextResponse.json({
        events: [],
        warning: copy.noReliable,
        code: "NO_RELIABLE_EVENTS",
      });
    }

    return NextResponse.json({
      events,
      discardedCount: Math.max(0, parsedEvents.length - events.length),
    });
  } catch (error: any) {
    console.error("OCR Route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
