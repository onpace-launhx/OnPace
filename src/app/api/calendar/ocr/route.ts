import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";

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

    const prompt = `You are an expert AI schedule & syllabus OCR parser for students.
Analyze this image of a study schedule, routine, class timetable, or to-do list screenshot.
Extract all study sessions, classes, exams, or task items.

Return ONLY a valid JSON array of objects with the following schema:
[
  {
    "title": "Short descriptive title of course, subject or task",
    "dayOfWeek": 1, // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday (or null if specific date given)
    "dateStr": "YYYY-MM-DD", // String YYYY-MM-DD if explicit date is in image, else null
    "startTime": "09:00", // HH:mm format 24-hour
    "durationMinutes": 60, // Number in minutes
    "type": "session" // "session" for calendar event/class, "task" for to-do item
  }
]

If the image is not legible or has no schedule information, return an empty array [].
Do NOT wrap in markdown backticks or explanation text, ONLY return the raw JSON array.`;

    const rawText = await generateAIText(supabase, {
      prompt,
      temperature: 0.1,
      json: true,
      image: {
        base64: imageBase64,
        mimeType: mimeType || "image/png",
      },
    });

    let events: any[] = [];
    try {
      events = parseAIJson<any[]>(rawText);
      if (!Array.isArray(events)) {
        throw new Error("Invalid calendar event schema");
      }
    } catch {
      events = [];
    }

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("OCR Route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
