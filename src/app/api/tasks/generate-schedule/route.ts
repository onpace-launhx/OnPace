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

    const { courses, language } = await request.json();
    const lang = language || "en";

    // Try to get API config
    const { data: config, error: rpcError } = await supabase.rpc("get_active_ai_config");

    if (rpcError || !config) {
      return NextResponse.json({ error: "AI configuration not found." }, { status: 400 });
    }

    const activeConfig = Array.isArray(config) ? config[0] : config;
    const apiKey = activeConfig?.api_key;
    const provider = activeConfig?.provider || "gemini";

    if (!apiKey) {
      return NextResponse.json({ error: "AI Key missing." }, { status: 400 });
    }

    // Build course context
    const courseContext = Array.isArray(courses) && courses.length > 0 
      ? `The student is taking the following courses: ${courses.join(", ")}.`
      : "The student has not listed specific courses.";

    const prompt = `Based on the student's background:
${courseContext}

Generate exactly 3 highly actionable, micro study-tasks for today (maximum 8 words each).
Tailor the tasks to their courses if specified.
The tasks MUST be in this language: "${lang === "tr" ? "Turkish" : lang === "es" ? "Spanish" : lang === "zh" ? "Chinese" : "English"}".

Return ONLY a raw valid JSON array of strings. Example format:
["First generated task details", "Second generated task details", "Third generated task details"]

Do not output markdown code fences, do not output any surrounding explanation. Return raw JSON text only.`;

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
          temperature: 0.5
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
            generationConfig: { temperature: 0.5 }
          }),
        }
      );
      const data = await response.json();
      aiOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    let generatedTasks: string[] = [];
    try {
      const cleanJson = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
      generatedTasks = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("AI Schedule Generator parsing error:", parseErr, "Output was:", aiOutput);
      return NextResponse.json({ error: "AI output parsing failed." }, { status: 500 });
    }

    return NextResponse.json({ tasks: generatedTasks });

  } catch (error: any) {
    console.error("Schedule generator server exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
