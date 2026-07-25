import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileUrl, contentType, base64Data, text, action = "ocr" } =
      await request.json();

    // Fetch active AI config (key and provider) from server side or system settings
    let apiKey = process.env.GEMINI_API_KEY;
    let provider = "gemini";

    const { data: config } = await supabase.rpc("get_active_ai_config");
    if (config) {
      const activeConfig = Array.isArray(config) ? config[0] : config;
      if (activeConfig?.api_key) {
        apiKey = activeConfig.api_key;
        provider = activeConfig.provider || "gemini";
      }
    }

    if (!apiKey) {
      const { data: settings } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", "default")
        .single();
      apiKey = settings?.geminiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI API credentials not configured." },
        { status: 400 }
      );
    }

    // ── Handle Action: Enhance Text ──────────────────────────────────────────
    if (action === "enhance") {
      if (!text || text.trim().length < 5) {
        return NextResponse.json(
          { error: "Note content is too short to enhance." },
          { status: 400 }
        );
      }

      const enhancePrompt = `You are an elite academic study assistant and note refiner.
Refine, organize, fix grammatical issues, add clear bold headers, bullet points, and key study takeaways for the following student note text:

"${text}"

Return ONLY a raw valid JSON object with "title" and "enhancedContent" properties.
"title": a concise, accurate academic title.
"enhancedContent": the beautifully formatted, structured, and expanded note content with bold headers (**Header**) and bullet points.

Return raw JSON only, no markdown code blocks or wrapper text.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: enhancePrompt }] }],
          }),
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to enhance note with AI." },
          { status: 500 }
        );
      }

      const resData = await response.json();
      const rawRes =
        resData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonClean = rawRes
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      try {
        const parsed = JSON.parse(jsonClean);
        return NextResponse.json({
          title: parsed.title,
          enhancedContent: parsed.enhancedContent,
        });
      } catch {
        return NextResponse.json({
          title: "Enhanced Note",
          enhancedContent: rawRes,
        });
      }
    }

    // ── Handle Action: OCR Image ─────────────────────────────────────────────
    if (!base64Data && !fileUrl) {
      return NextResponse.json(
        { error: "Image data is required for OCR analysis" },
        { status: 400 }
      );
    }

    const prompt = `Analyze this study note image. Perform OCR to extract all written text, diagrams, formulas, and main points. 
Generate a comprehensive, structured study note.

Strict Formatting Rules for 'content':
- DO NOT use the '#' character for headers. Instead, use bold text (e.g., "**Header Name**" on a new line) to separate sections.
- Return ONLY a raw valid JSON object with "title" and "content" properties.

Example format:
{
  "title": "Mitosis Cell Division",
  "content": "**Mitosis**\\nMitosis is a process of cell division...\\n\\n**Stages**\\n1. Prophase..."
}

Do not output markdown code fences, return raw JSON text only.`;

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
                    mime_type: contentType || "image/png",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to process note image" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed = { title: "Study Note", content: rawText };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Fallback
    }

    // Save to database
    const { data: newNote, error: insertError } = await supabase
      .from("notes")
      .insert([
        {
          user_id: user.id,
          title: parsed.title || "Study Note",
          content: parsed.content || rawText,
          file_url: fileUrl || null,
        },
      ])
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ note: newNote });
  } catch (error: any) {
    console.error("Notes analyze route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
