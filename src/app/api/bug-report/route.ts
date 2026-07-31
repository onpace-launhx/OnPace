import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIText, parseAIJson } from "@/lib/ai/server";
import { formatBugReportTrackingNumber } from "@/lib/bug-report";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function parseScreenshotDataUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;

  const match = value.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
  );
  if (!match || !ALLOWED_SCREENSHOT_TYPES.has(match[1])) return null;

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_SCREENSHOT_BYTES) return null;

  return {
    bytes,
    mimeType: match[1],
    base64: match[2],
  };
}

async function uploadScreenshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  screenshot: NonNullable<ReturnType<typeof parseScreenshotDataUrl>>
) {
  const extension =
    screenshot.mimeType === "image/jpeg"
      ? "jpg"
      : screenshot.mimeType.split("/")[1];
  const file = new File(
    [screenshot.bytes],
    `bug-report-${Date.now()}.${extension}`,
    { type: screenshot.mimeType }
  );
  const formData = new FormData();
  formData.append("file", file);

  const { data, error } = await supabase.functions.invoke("r2-upload", {
    body: formData,
  });
  if (typeof data?.url === "string") {
    return { url: data.url, error: null };
  }

  let message =
    (typeof data?.error === "string" && data.error) ||
    error?.message ||
    "R2 ekran görüntüsü yüklemesi tamamlanamadı.";

  try {
    const payload = await error?.context?.clone().json();
    if (typeof payload?.error === "string") message = payload.error;
  } catch {
    // The Edge Function response is not always JSON; keep the safe message.
  }

  return { url: null, error: message.slice(0, 500) };
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

    const { description, pageUrl, screenshotBase64 } = await request.json();

    if (!description || description.trim().length < 3) {
      return NextResponse.json(
        { error: "Description is too short." },
        { status: 400 }
      );
    }

    const screenshot = parseScreenshotDataUrl(screenshotBase64);
    const screenshotUpload = screenshot
      ? await uploadScreenshot(supabase, screenshot).catch((error) => ({
          url: null,
          error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "R2 ekran görüntüsü yüklemesi tamamlanamadı.",
        }))
      : { url: null, error: null };

    // AI categorization happens inside this server request. Provider details,
    // screenshot upload state, and category codes stay hidden from the reporter.
    const aiPrompt = `You are an AI Bug Classifier. Analyze the student's bug report description and page URL:
Page URL: "${pageUrl || "Unknown"}"
Description: "${description}"
${screenshot ? "A screenshot of the page is attached. Use visible errors, layout problems, and UI state as supporting evidence." : ""}

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
      const raw = await generateAIText(supabase, {
        prompt: aiPrompt,
        temperature: 0.1,
        json: true,
        ...(screenshot
          ? {
              image: {
                base64: screenshot.base64,
                mimeType: screenshot.mimeType,
              },
            }
          : {}),
      });
      const parsed = parseAIJson<{
        categoryCode?: string;
        categoryName?: string;
      }>(raw);
      const candidateCode = String(parsed.categoryCode || "");
      if (/^\d{4}$/.test(candidateCode)) categoryCode = candidateCode;
      if (
        typeof parsed.categoryName === "string" &&
        parsed.categoryName.trim().length <= 120
      ) {
        categoryName = parsed.categoryName.trim();
      }
    } catch {
      // Fallback heuristics if AI call fails
      const lower = description.toLowerCase();
      if (lower.includes("dil") || lower.includes("translate") || lower.includes("yazı")) {
        categoryCode = "5693";
        categoryName = "Language & Localization Issue";
      } else if (lower.includes("üst üste") || lower.includes("layout") || lower.includes("panel") || lower.includes("görünmüyor")) {
        categoryCode = "1204";
        categoryName = "UI Layout & Styling Issue";
      } else if (lower.includes("ai") || lower.includes("chat") || lower.includes("yapay zeka")) {
        categoryCode = "3301";
        categoryName = "AI Assistant & Chat Issue";
      } else if (lower.includes("ödeme") || lower.includes("payment") || lower.includes("fiyat")) {
        categoryCode = "4301";
        categoryName = "Billing & Payment Issue";
      } else if (lower.includes("takvim") || lower.includes("calendar") || lower.includes("görev")) {
        categoryCode = "2301";
        categoryName = "Calendar & Task Issue";
      }
    }

    // Save to bug_reports database table
    const { data: bugReport, error: insertError } = await supabase
      .from("bug_reports")
      .insert({
        user_id: user.id,
        user_email: user.email || "",
        page_url: pageUrl || "",
        description: description.trim(),
        screenshot_url: screenshotUpload.url,
        screenshot_status: screenshot
          ? screenshotUpload.url
            ? "uploaded"
            : "upload_failed"
          : "not_captured",
        screenshot_error: screenshotUpload.error,
        ai_category_code: categoryCode,
        ai_category_name: categoryName,
        status: "open"
      })
      .select("*")
      .single();

    if (insertError) {
      // The diagnostic columns are introduced by a migration. Keeping this
      // fallback lets existing installations continue to accept reports while
      // the migration is waiting to be applied.
      if (/screenshot_(status|error)/i.test(insertError.message || "")) {
        const { data: fallbackReport, error: fallbackError } = await supabase
          .from("bug_reports")
          .insert({
            user_id: user.id,
            user_email: user.email || "",
            page_url: pageUrl || "",
            description: description.trim(),
            screenshot_url: screenshotUpload.url,
            ai_category_code: categoryCode,
            ai_category_name: categoryName,
            status: "open",
          })
          .select("*")
          .single();

        if (!fallbackError) {
          return NextResponse.json({
            success: true,
            reportId: fallbackReport.id,
            trackingNumber: formatBugReportTrackingNumber(fallbackReport.id),
          });
        }
      }
      console.error("Error inserting bug report:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reportId: bugReport.id,
      trackingNumber: formatBugReportTrackingNumber(bugReport.id),
    });

  } catch (error) {
    console.error("Bug report route exception:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
