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

    const { description, pageUrl, screenshotBase64 } = await request.json();

    if (!description || description.trim().length < 3) {
      return NextResponse.json(
        { error: "Description is too short." },
        { status: 400 }
      );
    }

    // AI Categorization Prompt
    const aiPrompt = `You are an AI Bug Classifier. Analyze the student's bug report description and page URL:
Page URL: "${pageUrl || "Unknown"}"
Description: "${description}"

Assign a 4-digit category code and category name based on these rules:
- 5000-5999: Language, Translation, or i18n localization issue
- 1000-1999: UI Layout, Visual overlap, Responsive or CSS issue
- 3000-3999: AI Assistant, Chat, or AI Prompting issue
- 4000-4999: Billing, Payment, Promo Code, or Pricing issue
- 2000-2999: Calendar, Tasks, Notes, Flashcards, or Feature functional bug
- 9000-9999: General / Unknown Error

Return ONLY a valid raw JSON object with "categoryCode" (4-digit string, e.g. "5693") and "categoryName" (string, e.g. "Language & Localization Issue"). Do not include markdown code fences.`;

    let categoryCode = "9000";
    let categoryName = "General Issue";

    // Attempt AI categorization using active AI key
    try {
      let apiKey = process.env.GEMINI_API_KEY;
      let provider = "gemini";
      const { data: config } = await supabase.rpc("get_active_ai_config");
      if (config) {
        const activeConfig = Array.isArray(config) ? config[0] : config;
        if (activeConfig?.api_key) {
          apiKey = activeConfig.api_key;
          provider = activeConfig.provider || "gemini";
        }
      }

      if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      }

      const geminiKey = (provider === "gemini" ? apiKey : undefined) || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

      if (geminiKey) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: aiPrompt }] }],
            }),
          }
        );

        if (response.ok) {
          const resData = await response.json();
          const rawRes =
            resData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonClean = rawRes.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(jsonClean);
          if (parsed.categoryCode) categoryCode = String(parsed.categoryCode);
          if (parsed.categoryName) categoryName = String(parsed.categoryName);
        }
      }
    } catch {
      // Fallback heuristics if AI call fails
      const lower = description.toLowerCase();
      if (lower.includes("dil") || lower.includes("translate") || lower.includes("yazı") || lower.includes("dil")) {
        categoryCode = "5693";
        categoryName = "Language & Localization Issue";
      } else if (lower.includes("üst üste") || lower.includes("layout") || lower.includes("panel") || lower.includes("görünmüyor")) {
        categoryCode = "1204";
        categoryName = "UI Layout & Styling Issue";
      } else if (lower.includes("ai") || lower.includes("chat") || lower.includes("yapay zeka")) {
        categoryCode = "3301";
        categoryName = "AI Assistant & Chat Issue";
      }
    }

    // Save screenshot or store base64 string
    const screenshotUrl = screenshotBase64 || null;

    // Save to bug_reports database table
    const { data: bugReport, error: insertError } = await supabase
      .from("bug_reports")
      .insert({
        user_id: user.id,
        user_email: user.email || "",
        page_url: pageUrl || "",
        description: description.trim(),
        screenshot_url: screenshotUrl,
        ai_category_code: categoryCode,
        ai_category_name: categoryName,
        status: "open"
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Error inserting bug report:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report: bugReport,
      categoryCode,
      categoryName
    });

  } catch (error: any) {
    console.error("Bug report route exception:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
