import { createClient } from "npm:@supabase/supabase-js@2"
import { emailShell } from "../_shared/email.ts"
import { corsPreflight, json, readProviderError } from "../_shared/http.ts"

const BATCH_SIZE = 100

function chunks<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function localizedField(value: unknown, language: unknown) {
  if (typeof value === "string") return value.trim()
  if (!value || typeof value !== "object") return ""
  const fields = value as Record<string, unknown>
  const selected =
    fields[String(language || "en")] || fields.en || fields.tr || fields.es || fields.zh
  return typeof selected === "string" ? selected.trim() : ""
}

function localizedEmailChrome(language: unknown) {
  const copy = {
    en: { tagline: "AI-powered study platform", footer: "OnPace. All rights reserved." },
    tr: { tagline: "Yapay zeka destekli çalışma platformu", footer: "OnPace. Tüm hakları saklıdır." },
    es: { tagline: "Plataforma de estudio con IA", footer: "OnPace. Todos los derechos reservados." },
    zh: { tagline: "AI 驱动的学习平台", footer: "OnPace。保留所有权利。" },
  }
  return copy[String(language || "en") as keyof typeof copy] || copy.en
}

Deno.serve(async (request) => {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const url = Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || ""
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const authorization = request.headers.get("Authorization") || ""

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const {
      data: { user },
    } = await caller.auth.getUser()
    if (!user) return json({ error: "Unauthorized" }, 401)

    const { data: profile } = await caller
      .from("profiles")
      .select("role, permissions")
      .eq("id", user.id)
      .single()
    const allowed =
      profile?.role === "super_admin" ||
      (profile?.role === "admin" &&
        (profile?.permissions || []).includes("manage_communications"))
    if (!allowed) return json({ error: "Forbidden" }, 403)

    const {
      subject,
      content,
      isMandatory = false,
      targetUserId = null,
      targetPlan = null,
      sendEmail = true,
      sendInApp = true,
    } = await request.json()
    if (!localizedField(subject, "en") || !localizedField(content, "en")) {
      return json({ error: "Subject and content are required" }, 400)
    }
    if (!sendEmail && !sendInApp) {
      return json({ error: "Select at least one delivery channel" }, 400)
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    let query = admin
      .from("profiles")
      .select("id, email, full_name, language, email_notifications_enabled")
    if (targetUserId) query = query.eq("id", targetUserId)
    else if (targetPlan) query = query.eq("plan", targetPlan)
    // Marketing/feature emails always respect consent. Only explicitly mandatory
    // security or service communications may reach opted-out users.
    if (sendEmail && !isMandatory) {
      query = query.or(
        "email_notifications_enabled.eq.true,email_notifications_enabled.is.null"
      )
    }
    const { data: recipients, error: recipientsError } = await query
    if (recipientsError) return json({ error: recipientsError.message }, 400)
    if (!recipients?.length) return json({ error: "No recipients matched" }, 404)

    const { data: integrationData } = await admin.rpc(
      "get_edge_integration_config"
    )
    const integration = Array.isArray(integrationData)
      ? integrationData[0]
      : integrationData
    const apiKey = Deno.env.get("RESEND_API_KEY") || integration?.resend_api_key
    const fromAddress =
      Deno.env.get("EMAIL_FROM_ADDRESS") ||
      integration?.email_from_address ||
      "noreply@onpace.app"
    const fromName =
      Deno.env.get("EMAIL_FROM_NAME") ||
      integration?.email_from_name ||
      "OnPace"

    let sentCount = 0
    let failedCount = 0
    if (sendEmail) {
      if (!apiKey) return json({ error: "Resend is not configured" }, 503)
      const emailRecipients = recipients.filter((recipient) => recipient.email)
      for (const group of chunks(emailRecipients, BATCH_SIZE)) {
        const response = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify(
            group.map((recipient) => {
              const chrome = localizedEmailChrome(recipient.language)
              return {
                from: `${fromName} <${fromAddress}>`,
                to: [recipient.email],
                subject: localizedField(subject, recipient.language),
                html: emailShell({
                  heading: localizedField(subject, recipient.language),
                  message: `${recipient.full_name ? `${recipient.full_name},\n\n` : ""}${localizedField(content, recipient.language)}`,
                  tagline: chrome.tagline,
                  footer: chrome.footer,
                }),
                tags: [{ name: "source", value: "onpace_admin" }],
              }
            })
          ),
        })
        if (response.ok) sentCount += group.length
        else {
          failedCount += group.length
          console.error("Resend batch error", await readProviderError(response))
        }
      }
    }

    if (sendInApp) {
      const rows = recipients.map((recipient) => ({
        user_id: recipient.id,
        title: localizedField(subject, recipient.language),
        content: localizedField(content, recipient.language),
        type: isMandatory ? "alert" : "announcement",
      }))
      for (const group of chunks(rows, 500)) {
        const { error } = await admin.from("notifications").insert(group)
        if (error) console.error("Notification insert error", error)
      }
    }

    return json({
      success: true,
      sentCount,
      failedCount,
      inAppCount: sendInApp ? recipients.length : 0,
      totalRecipients: recipients.length,
    })
  } catch (error) {
    console.error("Broadcast function error", error)
    return json(
      { error: error instanceof Error ? error.message : "Broadcast failed" },
      500
    )
  }
})
