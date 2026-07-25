import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPaymentProviderAdapter,
  PaymentConfigurationError,
} from "@/lib/payments/server";

const PLAN_KEYS: Record<string, { plan: string; cycle: string }> = {
  pro_monthly: { plan: "pro", cycle: "monthly" },
  pro_yearly: { plan: "pro", cycle: "yearly" },
  founding_member: { plan: "founding", cycle: "lifetime" },
};

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
    if (!settings.payment_provider_configured) {
      return NextResponse.json(
        { error: "The payment provider has not been configured yet." },
        { status: 503 }
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
    const origin = new URL(request.url).origin;
    const adapter = getPaymentProviderAdapter(settings.payment_provider);
    const session = await adapter.createCheckoutSession({
      userId: user.id,
      email: user.email,
      planType: plan_type,
      billingCycle: billing_cycle,
      amount,
      currency: "USD",
      successUrl: `${origin}/billing?checkout=success`,
      cancelUrl: `${origin}/billing?checkout=cancelled`,
    });

    // Subscription activation must be performed only by a verified provider
    // webhook. A checkout request never grants a plan directly.
    return NextResponse.json({
      success: true,
      checkoutUrl: session.checkoutUrl,
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
      { status: error instanceof PaymentConfigurationError ? 503 : 500 }
    );
  }
}
