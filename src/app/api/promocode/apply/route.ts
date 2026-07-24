import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check session
    const { data: { user } } = await supabase.auth.getUser();

    const { code, isSignup } = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    const inputCode = code.trim();

    // 1. Fetch promocode details
    const { data: promo, error: promoError } = await supabase
      .from("promocodes")
      .select("*")
      .ilike("code", inputCode)
      .single();

    if (promoError || !promo) {
      return NextResponse.json({ error: "Invalid promo code." }, { status: 400 });
    }

    const now = new Date();
    const startDate = new Date(promo.start_date);
    const endDate = new Date(promo.end_date);

    if (now < startDate || now > endDate) {
      return NextResponse.json({ error: "This promo code has expired or is not active yet." }, { status: 400 });
    }

    if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
      return NextResponse.json({ error: "This promo code has reached its maximum usage limit." }, { status: 400 });
    }

    // If it's just a validation check during signup, return success early without applying
    if (isSignup) {
      let desc = "";
      if (promo.discount_type === "lifetime") {
        desc = "Lifetime Free Pro Access";
      } else if (promo.discount_type === "free_trial") {
        desc = `${promo.discount_value} Days Free Pro Trial`;
      } else {
        desc = `${promo.discount_value}% Discount on Purchase`;
      }
      return NextResponse.json({
        success: true,
        valid: true,
        description: desc,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Determine changes to user profile
    let targetPlan = "free";
    let trialEnds: string | null = null;
    let discountPercent = 0;

    if (promo.discount_type === "lifetime") {
      targetPlan = "pro";
    } else if (promo.discount_type === "free_trial") {
      targetPlan = "pro";
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + promo.discount_value);
      trialEnds = targetDate.toISOString();
    } else if (promo.discount_type === "percentage") {
      discountPercent = promo.discount_value;
    }

    // 3. Update profile
    const updateData: any = {};
    if (promo.discount_type !== "percentage") {
      updateData.plan = targetPlan;
      updateData.trial_ends_at = trialEnds;
      updateData.subscription_status = "active";
    } else {
      updateData.discount_percent = discountPercent;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to apply promocode to profile:", updateError);
      return NextResponse.json({ error: "Failed to apply promo code." }, { status: 500 });
    }

    // 4. Increment promo usage count
    const { error: incError } = await supabase
      .from("promocodes")
      .update({ uses_count: promo.uses_count + 1 })
      .eq("id", promo.id);

    if (incError) {
      console.error("Failed to increment promo usage count:", incError);
    }

    let message = "";
    if (promo.discount_type === "lifetime") {
      message = "Lifetime Pro Access activated successfully! 🎉";
    } else if (promo.discount_type === "free_trial") {
      message = `${promo.discount_value}-day Pro Trial activated successfully! 🚀`;
    } else if (promo.discount_type === "percentage") {
      message = `${promo.discount_value}% Discount applied to your billing checkout! 💰`;
    }

    return NextResponse.json({
      success: true,
      message,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value
    });

  } catch (error: any) {
    console.error("Promocode apply error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
