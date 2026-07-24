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
      return NextResponse.json({ error: "AI key not configured." }, { status: 400 });
    }

    const { task_id, title, course_id, due_date } = await request.json();

    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: "Task title is too short to break down." }, { status: 400 });
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();

    const userLang = userProfile?.language || "en";

    // AI prompt for JSON array of subtasks
    const prompt = `Break down the student study task: "${title}" into exactly 3 smaller, highly actionable study sub-tasks (maximum 8 words each).
The target response language is '${userLang}' (e.g. if 'zh' write in Chinese, if 'tr' write in Turkish, if 'es' in Spanish, if 'en' in English).
Return ONLY a raw valid JSON array of strings. Example output format:
["First subtask details", "Second subtask details", "Third subtask details"]

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

    let subtasksText: string[] = [];
    try {
      const cleanJson = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
      subtasksText = JSON.parse(cleanJson);
    } catch (parseErr: any) {
      console.error("AI Task Breakdown output parsing error:", parseErr, "Output was:", aiOutput);

      await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: "Failed to parse AI Task Breakdown JSON",
        details: `Raw output: ${aiOutput}. Error: ${parseErr.message || String(parseErr)}`
      });

      return NextResponse.json(
        { error: "AI generated invalid JSON structure. Please try again." },
        { status: 500 }
      );
    }

    // Insert generated subtasks into tasks table
    const dbSubtasks = subtasksText.map((subTitle) => ({
      user_id: user.id,
      course_id: course_id || null,
      title: subTitle,
      due_date: due_date || null,
      priority: "low",
      status: "todo",
      parent_id: task_id,
      estimated_minutes: 15
    }));

    const { data: insertedSubtasks, error: insertError } = await supabase
      .from("tasks")
      .insert(dbSubtasks)
      .select("*");

    if (insertError) {
      console.error("Failed to insert subtasks:", insertError);
      return NextResponse.json({ error: "Failed to save subtasks." }, { status: 500 });
    }

    return NextResponse.json({ subtasks: insertedSubtasks });

  } catch (error: any) {
    console.error("Task breakdown server exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
