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

    // Call secure RPC to fetch the active AI key and provider on the server side
    const { data: config, error: rpcError } = await supabase.rpc("get_active_ai_config");

    if (rpcError || !config) {
      console.error("Supabase RPC error calling get_active_ai_config:", rpcError);
      return NextResponse.json(
        { error: "AI configuration not set. Please contact administrator." },
        { status: 400 }
      );
    }

    const activeConfig = Array.isArray(config) ? config[0] : config;
    const apiKey = activeConfig?.api_key;
    const provider = activeConfig?.provider || "gemini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI API credentials not configured." },
        { status: 400 }
      );
    }

    const { note_id, title, content } = await request.json();

    if (!content || content.trim().length < 20) {
      return NextResponse.json(
        { error: "Notes content is too short to generate flashcards. Please write at least 20 characters." },
        { status: 400 }
      );
    }

    // System prompt requesting structured JSON output (extremely token-efficient)
    const prompt = `Based on the following student study notes, generate exactly 3 highly relevant review flashcards.
Title: ${title}
Content: ${content}

Return ONLY a raw valid JSON array containing objects with exactly "question" and "answer" properties. Example output:
[
  {"question": "What is the capital of France?", "answer": "Paris"},
  {"question": "Who wrote Hamlet?", "answer": "Shakespeare"}
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
          model: "gpt-5.4-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        }),
      });
      const data = await response.json();
      aiOutput = data.choices?.[0]?.message?.content || "";
    } else {
      // Gemini REST API call
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3
            }
          }),
        }
      );
      const data = await response.json();
      aiOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Parse AI output cleanly
    let cards: any[] = [];
    try {
      // Clean any potential markdown wrappers if AI output has it
      const cleanJson = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
      cards = JSON.parse(cleanJson);
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
