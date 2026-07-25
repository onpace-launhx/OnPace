import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const {
      subject,
      content,
      isMandatory = false,
      onlyOptedIn = true,
      targetUserId = null,
      targetPlan = null,
    } = await request.json();

    if (!subject || !content) {
      return NextResponse.json(
        { error: "Subject and content are required" },
        { status: 400 }
      );
    }

    // Retrieve Resend API Key from system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const resendApiKey =
      process.env.RESEND_API_KEY || settings?.resend_api_key;

    if (!resendApiKey) {
      return NextResponse.json(
        {
          error:
            "Resend API Key is missing. Please configure it in Admin Settings.",
        },
        { status: 400 }
      );
    }

    // Query target recipients
    let query = supabase.from("profiles").select("id, email, full_name, language, email_notifications_enabled");

    if (targetUserId) {
      query = query.eq("id", targetUserId);
    } else if (targetPlan) {
      query = query.eq("plan", targetPlan);
    }

    if (!isMandatory && onlyOptedIn) {
      query = query.or("email_notifications_enabled.eq.true,email_notifications_enabled.is.null");
    }

    const { data: recipients, error: recipientsErr } = await query;

    if (recipientsErr || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: "No matching recipients found for email dispatch." },
        { status: 404 }
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      if (!recipient.email) continue;

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "OnPace <noreply@onpace.app>",
            to: [recipient.email],
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #4f46e5; margin: 0;">OnPace</h2>
                  <p style="color: #64748b; font-size: 12px; margin-top: 4px;">AI-Powered Exam & Study Platform</p>
                </div>
                <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
                  <h3 style="color: #0f172a; margin-top: 0;">${subject}</h3>
                  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello ${recipient.full_name || "Student"},</p>
                  <div style="color: #334155; font-size: 14px; line-height: 1.6; whitespace: pre-wrap;">
                    ${content}
                  </div>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8;">
                  <p>© OnPace App. All rights reserved.</p>
                  ${!isMandatory ? `<p>You received this email because you opted in to OnPace announcements.</p>` : ``}
                </div>
              </div>
            `,
          }),
        });

        if (resendRes.ok) {
          sentCount++;
          // Also create in-app notification
          await supabase.from("notifications").insert({
            user_id: recipient.id,
            title: subject,
            content: content,
            type: "announcement"
          });
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
    });
  } catch (error: any) {
    console.error("Email send route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
