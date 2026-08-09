import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIServiceError, generateAIText, parseAIJson } from "@/lib/ai/server";
import { languageName, normalizeLanguage } from "@/lib/i18n";
import { normalizeStudyVisual } from "@/lib/study-visual";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const source = typeof body?.source === "string" ? body.source.trim().slice(0, 12_000) : "";
    if (source.length < 3) {
      return NextResponse.json({ error: "Add a topic or study note first." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();
    const languageCode = normalizeLanguage(body?.language || profile?.language);
    const outputLanguage = languageName(languageCode);
    const requestedTitle = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
    const meaningfulWords = source.split(/\s+/).filter((word: string) => word.replace(/[^\p{L}\p{N}]/gu, "").length > 1);
    if (source.length < 80 || meaningfulWords.length < 10) {
      const message = {
        en: "Add a little more study material first — for example the topic, key concepts, and one example — then I can create a useful visual summary.",
        tr: "Önce biraz daha çalışma materyali ekleyin: konu, temel kavramlar ve bir örnek yazarsanız yararlı bir görsel özet oluşturabilirim.",
        es: "Añade un poco más de material: el tema, los conceptos clave y un ejemplo. Así podré crear un resumen visual útil.",
        zh: "请先补充更多学习材料，例如主题、关键概念和一个例子；这样我才能生成有用的可视化总结。",
      }[languageCode];
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const prompt = `Turn the study material below into a compact visual learning aid rendered by the OnPace interface.
Choose exactly one kind: flow, timeline, comparison, concept_map, or checklist.
Write all user-facing text in ${outputLanguage}. Do not describe or request an image. Do not use markdown.
Use 4 to 6 concise items. For comparison, use exactly two short group names and set every item's group.

Optional title context: ${JSON.stringify(requestedTitle)}
Study material: ${JSON.stringify(source)}

Return ONLY raw JSON in this shape:
{"kind":"concept_map","title":"...","subtitle":"...","items":[{"label":"...","detail":"...","group":""}],"takeaway":"..."}`;

    const raw = await generateAIText(supabase, {
      workload: "reasoning",
      prompt,
      systemInstruction: `You create accurate structured study visuals. The interface language is ${outputLanguage}. Return JSON only and never invent facts that are not supported by the supplied study material.`,
      temperature: 0.2,
      json: true,
    });
    const visual = normalizeStudyVisual(parseAIJson(raw));
    if (!visual) {
      return NextResponse.json({ error: "AI could not create a valid study visual." }, { status: 502 });
    }
    return NextResponse.json({ visual });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Study visual is temporarily unavailable." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
