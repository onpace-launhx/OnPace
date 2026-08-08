import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type BillingPayload = Record<string, unknown>;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function rawFunctionErrorMessage(error: unknown) {
  const fallback = "Subscription service could not complete the request. Its database update or Edge Function may still be waiting for the final release.";
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as { message?: string; context?: unknown };
  let message = candidate.message || fallback;
  const context = candidate.context;
  if (context && typeof context === "object") {
    const response = context as { clone?: () => Response; json?: () => Promise<unknown>; text?: () => Promise<string> };
    try {
      const readable = typeof response.clone === "function" ? response.clone() : response;
      const payload = typeof readable.json === "function" ? await readable.json() as { error?: string; message?: string } : null;
      message = payload?.error || payload?.message || message;
    } catch {
      try {
        const readable = typeof response.clone === "function" ? response.clone() : response;
        const text = typeof readable.text === "function" ? await readable.text() : "";
        if (text) message = text;
      } catch {
        // Keep the most useful message already available.
      }
    }
  }
  return message;
}

function isMissingEdgeFunction(message: string) {
  return /Requested function was not found|Function not found|404.*function|function.*404/i.test(message);
}

function publicFunctionErrorMessage(message: string) {
  if (/Edge Function returned a non-2xx status code|Requested function was not found|Function not found/i.test(message)) {
    return "Subscription service could not complete the request. Its database update or Edge Function may still be waiting for the final release.";
  }
  return message;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function rpcError(error: { message?: string } | null) {
  const message = error?.message || "Bulk access operation failed.";
  if (/Could not find the function|schema cache|admin_create_bulk_access_preview|admin_execute_bulk_access_operation/i.test(message)) {
    return "The bulk access database update has not been applied yet. Run migration 202608090005, then try again.";
  }
  return message;
}

async function runBulkFallback(supabase: SupabaseServerClient, payload: BillingPayload) {
  if (payload.action === "bulk_preview") {
    const mode = payload.mode === "grant" ? "grant" : "reset";
    const requestedTarget = ["all", "free", "pro", "founding"].includes(String(payload.targetPlan)) ? String(payload.targetPlan) : "all";
    const targetPlan = mode === "grant" ? "free" : requestedTarget;
    const endsAtEastern = mode === "grant" ? String(payload.endsAtEastern || "") : null;
    if (mode === "grant" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endsAtEastern || "")) {
      return NextResponse.json({ error: "A valid Eastern Time campaign end is required." }, { status: 400 });
    }

    const previewToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const { data, error } = await supabase.rpc("admin_create_bulk_access_preview", {
      p_mode: mode,
      p_target_plan: targetPlan,
      p_confirmation_hash: await sha256(previewToken),
      p_ends_at_eastern: endsAtEastern,
      p_auto_assign_new_users: mode === "grant" && payload.autoAssignNewUsers === true,
    });
    if (error) return NextResponse.json({ error: rpcError(error) }, { status: 400 });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return NextResponse.json({ error: "Bulk preview could not be created." }, { status: 500 });
    const previewCount = Number(row.preview_count || 0);
    return NextResponse.json({
      success: true,
      operationId: row.operation_id,
      previewCount,
      previewToken,
      confirmationText: mode === "grant" ? `GRANT ${previewCount} PLANS` : `RESET ${previewCount} PLANS`,
      endsAtUtc: row.ends_at_utc,
      delivery: "database_fallback",
    });
  }

  if (payload.action === "bulk_execute") {
    const previewToken = String(payload.previewToken || "");
    const operationId = String(payload.operationId || "");
    const confirmation = String(payload.confirmation || "");
    if (!previewToken || !operationId || !confirmation) {
      return NextResponse.json({ error: "Bulk preview confirmation is incomplete." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("admin_execute_bulk_access_operation", {
      p_operation_id: operationId,
      p_confirmation_hash: await sha256(previewToken),
      p_confirmation_text: confirmation,
    });
    if (error) return NextResponse.json({ error: rpcError(error) }, { status: 400 });
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      success: true,
      affectedCount: Number(row?.affected_count || 0),
      campaign: row?.campaign_id ? { campaign_id: row.campaign_id, ends_at_utc: row.ends_at_utc } : null,
      endsAtUtc: row?.ends_at_utc || null,
      delivery: "database_fallback",
    });
  }

  return NextResponse.json({ error: "Unsupported bulk access operation." }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await request.json() as BillingPayload;
    const { data, error } = await supabase.functions.invoke("subscription-management", { body: payload });
    if (error) {
      const rawMessage = await rawFunctionErrorMessage(error);
      if ((payload.action === "bulk_preview" || payload.action === "bulk_execute") && isMissingEdgeFunction(rawMessage)) {
        return runBulkFallback(supabase, payload);
      }
      return NextResponse.json({ error: publicFunctionErrorMessage(rawMessage) }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Subscription operation failed." }, { status: 500 });
  }
}
