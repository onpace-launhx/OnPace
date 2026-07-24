import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Fetch all non-flagged posts with authors
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          full_name,
          learning_styles
        )
      `)
      .eq("is_flagged", false)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(posts || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || content.trim().length < 5) {
      return NextResponse.json({ error: "Post content is too short (min 5 chars)." }, { status: 400 });
    }

    // Call active AI key to perform real content moderation
    const { data: config, error: rpcError } = await supabase.rpc("get_active_ai_config");

    if (rpcError || !config) {
      console.error("Supabase RPC error calling get_active_ai_config:", rpcError);
      return NextResponse.json({ error: "AI configs not loaded." }, { status: 400 });
    }

    const activeConfig = Array.isArray(config) ? config[0] : config;
    const apiKey = activeConfig?.api_key;
    const provider = activeConfig?.provider || "gemini";

    if (!apiKey) {
      return NextResponse.json({ error: "AI key not configured by administrator." }, { status: 400 });
    }

    // Moderation Prompt
    const prompt = `Analyze the following student forum post: "${content}".
Moderation Rules:
1. Block any post containing offensive language, profanity, bullying, harassment, hate speech, sexual suggestions, or hostile remarks.
2. Block posts that are completely non-educational/academic spam (e.g. promoting unrelated commercial services, hacking, casino, illegal trade).
3. Allow motivational, academic, advice-seeking, syllabus study-plan, and standard peer-to-peer discussion.

Respond with exactly one word: "SAFE" or "FLAGGED". Do not include punctuation or markdown.`;

    let aiOutput = "SAFE";

    try {
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
            temperature: 0.1
          }),
        });
        const data = await response.json();
        aiOutput = data.choices?.[0]?.message?.content || "SAFE";
      } else {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1 }
            }),
          }
        );
        const data = await response.json();
        aiOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "SAFE";
      }
    } catch (err) {
      console.warn("AI Content Moderation call failed, falling back to basic check:", err);
    }

    const isFlagged = aiOutput.toUpperCase().includes("FLAGGED");

    if (isFlagged) {
      return NextResponse.json({ error: "Paylaşım yapay zeka moderasyonu tarafından engellendi. Lütfen akademik ve topluluk kurallarına uygun paylaşımlar yapın." }, { status: 400 });
    }

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content: content.trim(),
        is_flagged: false
      })
      .select("*, profiles(full_name, learning_styles)")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
