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
        { error: "Quiz oluşturmak için not içeriği en az 20 karakter olmalıdır." },
        { status: 400 }
      );
    }

    // AI prompt for structured JSON quiz generation
    const requestedCount = Math.min(20, Math.max(3, Number(count) || 6));
    const prompt = `Based on these study notes, generate exactly ${requestedCount} multiple-choice questions (4 options each) for a quiz.
Title: ${title}
Content: ${content}

Write every question, option, and explanation in ${outputLanguage}, regardless of the source-note language.
Only proper nouns, quotations, technical symbols, and acronyms may remain unchanged. Do not mix languages.

Return ONLY a raw valid JSON array. Each object in the array must have exactly:
- "question": (string) The query question.
- "options": (array of 4 strings) Multiple choice options.
- "correct_idx": (integer, 0 to 3) The index of the correct option in options.
- "explanation": (string) Short explanation why it is correct.

Example output:
[
  {
    "question": "What is the cell wall made of?",
    "options": ["Lipids", "Cellulose", "Proteins", "Starch"],
    "correct_idx": 1,
    "explanation": "Plant cell walls are primarily made of cellulose."
  }
]
Do not output markdown code fences, do not output any surrounding text. Return raw JSON text only.`;

    const aiOutput = await generateAIText(supabase, {
      prompt,
      systemInstruction: `The current OnPace interface language is ${outputLanguage}. Generate all user-facing quiz text exclusively in ${outputLanguage}.`,
      temperature: 0.3,
      json: true,
    });

    let questions: any[] = [];
    try {
      questions = parseAIJson<any[]>(aiOutput);
      if (
        !Array.isArray(questions) ||
        questions.length === 0 ||
        questions.some(
          (question) =>
            typeof question?.question !== "string" ||
            !Array.isArray(question?.options) ||
            question.options.length !== 4 ||
            !Number.isInteger(question?.correct_idx) ||
            question.correct_idx < 0 ||
            question.correct_idx > 3
        )
      ) {
        throw new Error("Invalid quiz schema");
      }
    } catch (parseErr: any) {
      console.error("AI Quiz output parsing error:", parseErr, "Output was:", aiOutput);

      await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: "Failed to parse AI Quiz JSON",
        details: `Raw output: ${aiOutput}. Error: ${parseErr.message || String(parseErr)}`
      });

      return NextResponse.json(
        { error: "AI generated invalid JSON structure. Please try again." },
        { status: 500 }
      );
    }

    // Insert generated quiz into database
    const { data: insertedQuiz, error: insertError } = await supabase
      .from("quizzes")
      .insert([{
        user_id: user.id,
        note_id,
        questions
      }])
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to insert quiz:", insertError);
      return NextResponse.json({ error: "Failed to save quiz to database." }, { status: 500 });
    }

    return NextResponse.json({ quiz: insertedQuiz });

  } catch (error: any) {
    console.error("Quiz generation server exception:", error);
    return NextResponse.json(
      { error: error.message || "Quiz generation failed." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
