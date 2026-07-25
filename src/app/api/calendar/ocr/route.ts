import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Retrieve Gemini API key from system settings or process.env
    const { data: settings } = await supabase
      .from("system_settings")
      .select("*")
      .eq("id", "default")
      .single();

    const apiKey =
      process.env.GEMINI_API_KEY ||
      settings?.geminiKey ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API Key is not configured in system settings." },
        { status: 500 }
      );
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || "image/png",
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini Vision API error:", errText);
      return NextResponse.json(
        { error: "Failed to process image with Vision AI" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Clean markdown code fence if returned
    const jsonText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    let events = [];
    try {
      events = JSON.parse(jsonText);
    } catch {
      events = [];
    }

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("OCR Route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
