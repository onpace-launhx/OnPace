import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIServiceError, generateAIText } from "@/lib/ai/server";

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

    // Moderation Prompt
    const prompt = `Analyze the following student forum post: "${content}".
Moderation Rules:
1. Block any post containing offensive language, profanity, bullying, harassment, hate speech, sexual suggestions, or hostile remarks.
2. Block posts that are completely non-educational/academic spam (e.g. promoting unrelated commercial services, hacking, casino, illegal trade).
3. Allow motivational, academic, advice-seeking, syllabus study-plan, and standard peer-to-peer discussion.

Respond with exactly one word: "SAFE" or "FLAGGED". Do not include punctuation or markdown.`;

    const aiOutput = await generateAIText(supabase, {
      prompt,
      temperature: 0.1,
    });

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
    return NextResponse.json(
      { error: error.message || "Post could not be moderated." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
