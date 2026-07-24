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

    const { plan_type, billing_cycle, amount } = await request.json();

    if (!plan_type || !billing_cycle || amount === undefined) {
      return NextResponse.json({ error: "Missing checkout parameters" }, { status: 400 });
    }

    // Determine target plan name
    let targetPlan = "free";
    if (plan_type === "pro_monthly" || plan_type === "pro_yearly") {
      targetPlan = "pro";
    } else if (plan_type === "founding_member") {
      targetPlan = "founding";
    }

    // Calculate next billing date
    let nextBillingDate: Date | null = null;
    if (billing_cycle === "monthly") {
      nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (billing_cycle === "yearly") {
      nextBillingDate = new Date();
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Mock stripe payment intent ID
    const mockPaymentIntent = "pi_" + Math.random().toString(36).substring(2, 15);

    // 1. Update user profile with new subscription plan details
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        plan: targetPlan,
        billing_cycle,
        subscription_status: "active",
        trial_ends_at: null, // Clear trial state since they paid
        next_billing_date: nextBillingDate ? nextBillingDate.toISOString() : null,
        failed_payment_attempts: 0 // Reset any failures
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Failed to update profile plan:", profileError);
      return NextResponse.json({ error: "Failed to update subscription profile." }, { status: 500 });
    }

    // 2. Insert invoice details into purchase_history
    const { error: historyError } = await supabase
      .from("purchase_history")
      .insert([
        {
          user_id: user.id,
          amount,
          plan_type,
          billing_cycle,
          stripe_payment_intent_id: mockPaymentIntent,
          status: "completed",
          next_billing_date: nextBillingDate ? nextBillingDate.toISOString() : null
        },
      ]);

    if (historyError) {
      console.error("Failed to write to purchase history:", historyError);
      // Don't fail checkout since profile updated, but log it
      await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: "Failed to write to purchase history table during mock Stripe checkout",
        details: JSON.stringify(historyError),
      });
    }

    return NextResponse.json({ success: true, plan: targetPlan });

  } catch (error: any) {
    console.error("Stripe Mock checkout server exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
