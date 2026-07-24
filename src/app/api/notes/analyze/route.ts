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

    const { fileUrl, contentType, base64Data } = await request.json();

    if (!fileUrl) {
      return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
    }

    if (!base64Data) {
      return NextResponse.json({ error: "base64Data is required" }, { status: 400 });
    }

    // Fetch active AI config (key and provider) from server side
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

    const prompt = `Analyze this study note image. Perform OCR to extract all written text, diagrams, formulas, and main points. 
Generate a comprehensive, structured study note.

Strict Formatting Rules for 'content':
- DO NOT use the '#' character for headers. Instead, use bold text (e.g., "**Header Name**" on a new line) to separate sections.
- If the image is a portrait photo, landscape, or content completely unrelated to academic studies, still perform OCR or summarize the visible content. However, at the very end of the 'content', you MUST append a friendly question asking the user which course they want to associate this note with (e.g., "Bu içerik derslerinizle pek ilişkili görünmüyor. Bu notu hangi dersinizle ilişkilendirmek istersiniz?").

Return ONLY a raw valid JSON object with exactly "title" and "content" properties. "title" should be a short, descriptive title. "content" should be a detailed summary.

Example format:
{
  "title": "Mitosis Cell Division",
  "content": "**Mitosis**\\nMitosis is a process of cell division...\\n\\n**Stages**\\n1. Prophase...\\n2. Metaphase..."
}

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
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${contentType};base64,${base64Data}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.3,
        }),
      });
      
      const data = await response.json();
      aiOutput = data.choices?.[0]?.message?.content || "";
    } else {
      // Gemini API Multimodal Call
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: contentType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
            },
          }),
        }
      );
      
      const data = await response.json();
      aiOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Parse AI response
    let parsedResult: { title: string; content: string };
    try {
      const cleanJson = aiOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr: any) {
      console.error("AI Output parsing error:", parseErr, "Output was:", aiOutput);
      
      // Log parsing exception
      await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: "Failed to parse AI Note Analysis JSON",
        details: `Raw output: ${aiOutput}. Error: ${parseErr.message || String(parseErr)}`
      });

      return NextResponse.json(
        { error: "AI generated invalid JSON structure. Please try again." },
        { status: 500 }
      );
    }

    // Insert note in Supabase database
    const { data: newNote, error: insertError } = await supabase
      .from("notes")
      .insert([
        {
          user_id: user.id,
          title: parsedResult.title || "AI Analyzed Note",
          content: parsedResult.content || "",
          file_url: fileUrl,
        },
      ])
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to insert note:", insertError);
      return NextResponse.json({ error: "Failed to save note to database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: newNote });

  } catch (error: any) {
    console.error("Note analysis error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze study note" }, { status: 500 });
  }
}
