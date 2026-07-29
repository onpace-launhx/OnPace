import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";
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

    const { fileUrl, contentType, base64Data, text, action = "ocr", language } =
      await request.json();
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();
    const outputLanguageCode = normalizeLanguage(language || profile?.language);
    const outputLanguage = languageName(outputLanguageCode);
    const fallbackTitle = localized(outputLanguageCode, {
      en: "Study Note",
      tr: "Çalışma Notu",
      es: "Apunte de estudio",
      zh: "学习笔记",
    });
    const languageInstruction = `The current OnPace interface language is ${outputLanguage}. Write all generated titles, explanations, headings, summaries, and study content exclusively in ${outputLanguage}. Preserve only proper nouns, direct quotations, formulas, technical symbols, and acronyms when needed. Never infer the response language from the source text.`;

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

The complete result must be written in ${outputLanguage}. Do not mix languages.

Return ONLY a raw valid JSON object with "title" and "enhancedContent" properties.
"title": a concise, accurate academic title.
"enhancedContent": the beautifully formatted, structured, and expanded note content with bold headers (**Header**) and bullet points.

Return raw JSON only, no markdown code blocks or wrapper text.`;

      const rawRes = await generateAIText(supabase, {
        prompt: enhancePrompt,
        systemInstruction: languageInstruction,
        temperature: 0.25,
        json: true,
      });

      try {
        const parsed = parseAIJson<{
          title: string;
          enhancedContent: string;
        }>(rawRes);
        return NextResponse.json({
          title: parsed.title,
          enhancedContent: parsed.enhancedContent,
        });
      } catch {
        return NextResponse.json({
          title: fallbackTitle,
          enhancedContent: rawRes,
        });
      }
    }

    // ── Handle Action: OCR Image ─────────────────────────────────────────────
    if (!base64Data) {
      return NextResponse.json(
        { error: "Image data is required for OCR analysis" },
        { status: 400 }
      );
    }
    if (typeof base64Data !== "string" || base64Data.length > 8_500_000) {
      return NextResponse.json(
        { error: "The image is too large. Use an image smaller than 6 MB." },
        { status: 413 }
      );
    }

    const prompt = `Analyze this study note image. Perform OCR to extract all written text, diagrams, formulas, and main points. 
Generate a comprehensive, structured study note.
Write the generated note in ${outputLanguage}. Preserve source quotations, formulas, proper nouns, and acronyms when necessary, but do not mix interface languages.

Strict Formatting Rules for 'content':
- DO NOT use the '#' character for headers. Instead, use bold text (e.g., "**Header Name**" on a new line) to separate sections.
- Return ONLY a raw valid JSON object with "title" and "content" properties.

Example format:
{
  "title": "Mitosis Cell Division",
  "content": "**Mitosis**\\nMitosis is a process of cell division...\\n\\n**Stages**\\n1. Prophase..."
}

Do not output markdown code fences, return raw JSON text only.`;

    const rawText = await generateAIText(supabase, {
      prompt,
      systemInstruction: languageInstruction,
      temperature: 0.2,
      json: true,
      image: {
        base64: base64Data,
        mimeType: contentType || "image/png",
      },
    });

    let parsed = { title: fallbackTitle, content: rawText };
    try {
      parsed = parseAIJson<{ title: string; content: string }>(rawText);
    } catch {
      // Fallback
    }

    // Save to database
    const { data: newNote, error: insertError } = await supabase
      .from("notes")
      .insert([
        {
          user_id: user.id,
          title: parsed.title || fallbackTitle,
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
  } catch (error) {
    console.error("Notes analyze route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
