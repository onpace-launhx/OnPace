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

    // Fetch active API configuration on server
    const { data: config, error: rpcError } = await supabase.rpc("get_active_ai_config");

    if (rpcError || !config) {
      console.error("Supabase RPC error calling get_active_ai_config:", rpcError);
      return NextResponse.json({ error: "AI configs not loaded." }, { status: 400 });
    }

    const activeConfig = Array.isArray(config) ? config[0] : config;
    const apiKey = activeConfig?.api_key;
    const provider = activeConfig?.provider || "gemini";

    if (!apiKey) {
      return NextResponse.json({ error: "Yapay zeka anahtarı ayarlanmamış." }, { status: 400 });
    }

    const { note_id, title, content } = await request.json();

    if (!content || content.trim().length < 20) {
      return NextResponse.json(
        { error: "Quiz oluşturmak için not içeriği en az 20 karakter olmalıdır." },
        { status: 400 }
      );
    }

    // AI prompt for structured JSON quiz generation
    const prompt = `Based on these study notes, generate exactly 3 multiple-choice questions (4 options each) for a quiz.
Title: ${title}
Content: ${content}

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

    let aiOutput = "";

    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        }),
      });
      const data = await response.json();
      aiOutput = data.choices?.[0]?.message?.content || "";
    } else {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          }),
        }
      );
      const data = await response.json();
      aiOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    let questions: any[] = [];
    try {
      const cleanJson = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
      questions = JSON.parse(cleanJson);
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
