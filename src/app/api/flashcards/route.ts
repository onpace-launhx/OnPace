import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";
import { languageName, normalizeLanguage } from "@/lib/i18n";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { note_id, title, content, count, language } = await request.json();
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();
    const outputLanguage = languageName(
      normalizeLanguage(language || profile?.language)
    );

    if (!content || content.trim().length < 20) {
      return NextResponse.json(
        { error: "Notes content is too short to generate flashcards. Please write at least 20 characters." },
        { status: 400 }
      );
    }

    // System prompt requesting structured JSON output (extremely token-efficient)
    const requestedCount = Math.min(20, Math.max(3, Number(count) || 6));
    const prompt = `Based on the following student study notes, generate exactly ${requestedCount} highly relevant review flashcards.
Title: ${title}
Content: ${content}

Write every question and answer in ${outputLanguage}, regardless of the language of the source note.
Only proper nouns, quotations, technical symbols, and acronyms may remain unchanged. Do not mix languages.

Return ONLY a raw valid JSON array containing objects with exactly "question" and "answer" properties. Example output:
[
  {"question": "What is the capital of France?", "answer": "Paris"},
  {"question": "Who wrote Hamlet?", "answer": "Shakespeare"}
]
Do not output markdown code fences, do not output any surrounding text. Return raw JSON text only.`;

    const aiOutput = await generateAIText(supabase, {
      workload: "reasoning",
      prompt,
      systemInstruction: `The current OnPace interface language is ${outputLanguage}. Generate all user-facing flashcard text exclusively in ${outputLanguage}.`,
      temperature: 0.3,
      json: true,
    });

    // Parse AI output cleanly
    let cards: any[] = [];
    try {
      cards = parseAIJson<any[]>(aiOutput);
      if (
        !Array.isArray(cards) ||
        cards.length === 0 ||
        cards.some(
          (card) =>
            typeof card?.question !== "string" ||
            typeof card?.answer !== "string"
        )
      ) {
        throw new Error("Invalid flashcard schema");
      }
    } catch (parseErr: any) {
      console.error("AI output parsing error:", parseErr, "Output was:", aiOutput);
      
      // Log parsing exception
      await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: "Failed to parse AI Flashcards JSON",
        details: `Raw output: ${aiOutput}. Error: ${parseErr.message || String(parseErr)}`
      });

      return NextResponse.json(
        { error: "AI generated invalid JSON layout. Please try again." },
        { status: 500 }
      );
    }

    // Insert generated flashcards in database
    const dbCards = cards.map(c => ({
      user_id: user.id,
      note_id: note_id || null,
      question: c.question,
      answer: c.answer
    }));

    const { data: insertedCards, error: insertError } = await supabase
      .from("flashcards")
      .insert(dbCards)
      .select("*");

    if (insertError) {
      console.error("Failed to insert flashcards:", insertError);
      return NextResponse.json({ error: "Failed to save flashcards to database" }, { status: 500 });
    }

    return NextResponse.json({ flashcards: insertedCards });

  } catch (error: any) {
    console.error("Flashcards generation exception:", error);
    return NextResponse.json(
      { error: error.message || "Flashcard generation failed." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
