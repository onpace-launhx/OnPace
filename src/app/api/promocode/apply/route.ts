import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PromoValidation = {
  valid: boolean;
  error_message: string | null;
  discount_type: "percentage" | "free_trial" | "lifetime" | null;
  discount_value: number | null;
  description: string | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { code, isSignup } = await request.json();
    const inputCode = typeof code === "string" ? code.trim() : "";

    if (!inputCode) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    if (isSignup) {
      const { data, error } = await supabase.rpc("validate_promocode", {
        p_code: inputCode,
      });
      const promo = (Array.isArray(data) ? data[0] : data) as PromoValidation | null;

      if (error || !promo?.valid) {
        return NextResponse.json(
          { error: promo?.error_message || error?.message || "Invalid promo code." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        valid: true,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("redeem_promocode", {
      p_code: inputCode,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const redemption = Array.isArray(data) ? data[0] : data;
    const type = redemption?.discount_type;
    const value = Number(redemption?.discount_value || 0);
    const message =
      type === "lifetime"
        ? "Lifetime Pro Access activated successfully!"
        : type === "free_trial"
          ? `${value}-day Pro Trial activated successfully!`
          : `${value}% discount applied successfully!`;

    return NextResponse.json({
      success: true,
      message,
      discount_type: type,
      discount_value: value,
      trial_started_at: redemption?.trial_started_at || null,
      trial_ends_at: redemption?.trial_ends_at || null,
    });
  } catch (error) {
    console.error("Promocode apply error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply promo code." },
      { status: 500 }
    );
  }
}
