import { createClient } from "npm:@supabase/supabase-js@2"
import { emailShell } from "../_shared/email.ts"
import { corsPreflight, json, readProviderError } from "../_shared/http.ts"

const BATCH_SIZE = 100

function createCampaignToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

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
      targetLanguage = null,
      targetGrade = null,
      targetRole = null,
      targetUserIds = [],
      emailSearch = null,
      ctaLabel = null,
      ctaUrl = null,
      rewardEnabled = false,
      rewardPlan = "pro",
      rewardDays = 7,
      rewardValidDays = 7,
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
      .select("id, email, full_name, language, grade_level, role, plan, email_notifications_enabled")
    if (targetUserId) query = query.eq("id", targetUserId)
    else {
      if (targetPlan) query = query.eq("plan", targetPlan)
      if (targetLanguage) query = query.eq("language", targetLanguage)
      if (targetGrade) query = query.eq("grade_level", targetGrade)
      if (targetRole) query = query.eq("role", targetRole)
      if (Array.isArray(targetUserIds) && targetUserIds.length) {
        const safeIds = targetUserIds
          .filter((id) => typeof id === "string")
          .slice(0, 500)
        if (safeIds.length) query = query.in("id", safeIds)
      }
      if (typeof emailSearch === "string" && emailSearch.trim()) {
        const safeSearch = emailSearch
          .trim()
          .slice(0, 100)
          .replace(/[,%()]/g, "")
        if (safeSearch) {
          query = query.or(
            `email.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`
          )
        }
      }
    }
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

    let actionUrl =
      typeof ctaUrl === "string" && /^https:\/\//i.test(ctaUrl.trim())
        ? ctaUrl.trim()
        : null
    const normalizedRewardDays = Math.max(1, Math.min(3650, Number(rewardDays) || 7))
    const normalizedValidDays = Math.max(1, Math.min(365, Number(rewardValidDays) || 7))
    let rewardCampaignId: string | null = null
    if (rewardEnabled) {
      if (!["pro", "plus"].includes(rewardPlan)) {
        return json({ error: "Unsupported reward plan" }, 400)
      }
      const rawToken = createCampaignToken()
      const { data: campaign, error: campaignError } = await admin
        .from("email_reward_campaigns")
        .insert({
          name: localizedField(subject, "en").slice(0, 180),
          token_hash: await sha256(rawToken),
          reward_plan: rewardPlan,
          reward_days: normalizedRewardDays,
          expires_at: new Date(
            Date.now() + normalizedValidDays * 24 * 60 * 60 * 1000
          ).toISOString(),
          max_claims: recipients.length,
          created_by: user.id,
        })
        .select("id")
        .single()
      if (campaignError || !campaign) {
        return json({ error: campaignError?.message || "Reward campaign failed" }, 400)
      }
      rewardCampaignId = campaign.id
      const eligibilityRows = recipients.map((recipient) => ({
        campaign_id: campaign.id,
        user_id: recipient.id,
      }))
      for (const group of chunks(eligibilityRows, 500)) {
        const { error } = await admin
          .from("email_reward_eligibility")
          .insert(group)
        if (error) return json({ error: error.message }, 400)
      }
      const appUrl = (Deno.env.get("APP_URL") || "https://onpace-ai.xyz")
        .replace(/\/+$/, "")
      actionUrl = `${appUrl}/rewards/claim?token=${encodeURIComponent(rawToken)}`
    }

    const { data: integrationData } = await admin.rpc(
      "get_edge_integration_config"
    )
    const integration = Array.isArray(integrationData)
      ? integrationData[0]
      : integrationData
    const apiKey = Deno.env.get("RESEND_API_KEY") || integration?.resend_api_key
    const fromAddress =
      Deno.env.get("ANNOUNCEMENT_EMAIL_FROM_ADDRESS") ||
      "no-reply@onpace-ai.xyz"
    const fromName =
      Deno.env.get("ANNOUNCEMENT_EMAIL_FROM_NAME") ||
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
              const localizedCtaLabel =
                localizedField(ctaLabel, recipient.language) ||
                (rewardEnabled
                  ? ({
                      en: "Activate my reward",
                      tr: "Ödülümü etkinleştir",
                      es: "Activar mi recompensa",
                      zh: "激活我的奖励",
                    }[String(recipient.language || "en")] ||
                    "Activate my reward")
                  : "")
              return {
                from: `${fromName} <${fromAddress}>`,
                to: [recipient.email],
                subject: localizedField(subject, recipient.language),
                html: emailShell({
                  heading: localizedField(subject, recipient.language),
                  message: `${recipient.full_name ? `${recipient.full_name},\n\n` : ""}${localizedField(content, recipient.language)}`,
                  buttonLabel: actionUrl ? localizedCtaLabel : undefined,
                  buttonUrl: actionUrl || undefined,
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
        action_url: actionUrl,
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
      rewardCampaignId,
    })
  } catch (error) {
    console.error("Broadcast function error", error)
    return json(
      { error: error instanceof Error ? error.message : "Broadcast failed" },
      500
    )
  }
})
