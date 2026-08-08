import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIServiceError, generateAIText } from "@/lib/ai/server";
import { richTextToPlainText } from "@/lib/rich-text";
import { localized } from "@/lib/i18n";

export async function GET() {
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
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Posts could not be loaded." }, { status: 500 });
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

    const { content, language } = await request.json();
    const messages = localized(language, {
      en: { short: "Write at least 5 characters.", long: "Posts can contain up to 400 visible characters.", flagged: "The post was blocked by AI moderation. Keep it academic and respectful." },
      tr: { short: "En az 5 karakter yazmalısın.", long: "Gönderiler görünür olarak en fazla 400 karakter içerebilir.", flagged: "Gönderi AI moderasyonu tarafından engellendi. Lütfen akademik ve saygılı bir içerik yaz." },
      es: { short: "Escribe al menos 5 caracteres.", long: "Las publicaciones pueden tener hasta 400 caracteres visibles.", flagged: "La moderación de IA bloqueó la publicación. Mantén un contenido académico y respetuoso." },
      zh: { short: "请至少输入 5 个字符。", long: "帖子最多可包含 400 个可见字符。", flagged: "AI 审核阻止了该帖子。请保持内容与学习相关并尊重他人。" },
    });
    const normalizedContent = typeof content === "string" ? content.trim() : "";
    const visibleContent = richTextToPlainText(normalizedContent);

    if (visibleContent.length < 5) {
      return NextResponse.json({ error: messages.short }, { status: 400 });
    }
    if (visibleContent.length > 400 || normalizedContent.length > 1200) {
      return NextResponse.json({ error: messages.long }, { status: 400 });
    }

    // Moderation Prompt
    const prompt = `Analyze the following student forum post: "${visibleContent}".
Moderation Rules:
1. Block any post containing offensive language, profanity, bullying, harassment, hate speech, sexual suggestions, or hostile remarks.
2. Block posts that are completely non-educational/academic spam (e.g. promoting unrelated commercial services, hacking, casino, illegal trade).
3. Allow motivational, academic, advice-seeking, syllabus study-plan, and standard peer-to-peer discussion.

Respond with exactly one word: "SAFE" or "FLAGGED". Do not include punctuation or markdown.`;

    const aiOutput = await generateAIText(supabase, {
      workload: "fast",
      prompt,
      temperature: 0.1,
    });

    const isFlagged = aiOutput.toUpperCase().includes("FLAGGED");

    if (isFlagged) {
      return NextResponse.json({ error: messages.flagged }, { status: 400 });
    }

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content: normalizedContent,
        is_flagged: false
      })
      .select("*, profiles(full_name, learning_styles)")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Post could not be moderated." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
