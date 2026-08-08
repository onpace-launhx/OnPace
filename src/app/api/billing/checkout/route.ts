import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_KEYS: Record<string, { plan: string; cycle: string }> = {
  pro_monthly: { plan: "pro", cycle: "monthly" },
  pro_yearly: { plan: "pro", cycle: "yearly" },
  founding_member: { plan: "founding", cycle: "lifetime" },
};

const ESHIPX_URLS: Record<string, string | undefined> = {
  pro_monthly:
    process.env.ESHIPX_PRO_MONTHLY_URL ||
    "https://eshipx.com/store/onpace/onpacemonthly",
  pro_yearly: process.env.ESHIPX_PRO_YEARLY_URL,
  founding_member: process.env.ESHIPX_FOUNDING_MEMBER_URL,
};

function safeEshipxUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "eshipx.com" || url.hostname.endsWith(".eshipx.com"))
      ? url.toString()
      : null;
  } catch {
    return null;
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

    const { plan_type, billing_cycle } = await request.json();
    const plan = PLAN_KEYS[plan_type];
    if (!plan || plan.cycle !== billing_cycle) {
      return NextResponse.json({ error: "Invalid plan selection." }, { status: 400 });
    }

    const { data: settingsRows, error: settingsError } = await supabase.rpc(
      "get_public_system_settings"
    );
    const settings = Array.isArray(settingsRows)
      ? settingsRows[0]
      : settingsRows;
    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Payment settings are unavailable." },
        { status: 503 }
      );
    }
    if (!settings.payment_gateway_enabled) {
      return NextResponse.json(
        { error: "Online payments are currently disabled." },
        { status: 403 }
      );
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("discount_percent")
      .eq("id", user.id)
      .maybeSingle();
    const legacyPrice =
      plan.plan === "pro" ? settings.plan_prices?.pro : settings.plan_prices?.founding;
    const basePrice = Number(settings.plan_prices?.[plan_type] ?? legacyPrice);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return NextResponse.json(
        { error: "This plan does not have a valid configured price." },
        { status: 503 }
      );
    }
    const discount = Math.max(0, Math.min(100, Number(profile?.discount_percent) || 0));
    const amount = Number((basePrice * (1 - discount / 100)).toFixed(2));
    const checkoutCatalog = settings.payment_checkout_urls;
    const checkoutUrl = safeEshipxUrl(
      checkoutCatalog && typeof checkoutCatalog === "object"
        ? checkoutCatalog[plan_type]
        : ESHIPX_URLS[plan_type]
    );
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "The EshipX link for this plan has not been configured yet." },
        { status: 503 }
      );
    }

    // This endpoint only hands the user to EshipX. It never grants access.
    // Access starts after a billing administrator matches the claim to an
    // EshipX reference and approves it.
    return NextResponse.json({
      success: true,
      checkoutUrl,
      provider: "eshipx",
      expectedAmount: amount,
      currency: "USD",
    });
  } catch (error) {
    console.error("Checkout initialization error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Checkout could not be initialized.",
      },
      { status: 500 }
    );
  }
}
