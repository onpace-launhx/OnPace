import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIText, parseAIJson } from "@/lib/ai/server";

const LANGUAGES = ["tr", "es", "zh"] as const;

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("id", user.id)
      .single();
    const canManageCommunications =
      profile?.role === "admin" ||
      profile?.role === "super_admin" ||
      (Array.isArray(profile?.permissions) && profile.permissions.includes("manage_communications"));

    if (profileError || !canManageCommunications) {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkiniz yok." }, { status: 403 });
    }

    const body = await request.json();
    const subject = cleanText(body?.subject, 250);
    const content = cleanText(body?.content, 12_000);
    if (!subject || !content) {
      return NextResponse.json({ error: "Önce İngilizce konu ve mesajı girin." }, { status: 400 });
    }

    const raw = await generateAIText(supabase, {
      temperature: 0.1,
      json: true,
      prompt: `Translate this product notification from English into Turkish (tr), Spanish (es), and Simplified Chinese (zh). Preserve all URLs, numbers, promotion codes, variables such as {{name}}, and intentional line breaks. Do not add greetings, explanations, or markdown fences. Return only JSON in exactly this shape: {"tr":{"subject":"...","content":"..."},"es":{"subject":"...","content":"..."},"zh":{"subject":"...","content":"..."}}.\n\nEnglish subject:\n${subject}\n\nEnglish content:\n${content}`,
    });
    const parsed = parseAIJson<Record<string, { subject?: unknown; content?: unknown }>>(raw);
    const translations = Object.fromEntries(
      LANGUAGES.map((language) => {
        const value = parsed[language] || {};
        return [language, {
          subject: cleanText(value.subject, 250),
          content: cleanText(value.content, 12_000),
        }];
      })
    );

    if (LANGUAGES.some((language) => !translations[language].subject || !translations[language].content)) {
      return NextResponse.json({ error: "AI tüm çevirileri geçerli biçimde döndüremedi. Lütfen tekrar deneyin." }, { status: 502 });
    }

    return NextResponse.json({ translations });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "AI çevirisi hazırlanamadı.",
    }, { status: 502 });
  }
}
