import { createClient } from "npm:@supabase/supabase-js@2"
import { corsPreflight, json } from "../_shared/http.ts"

const PAYMENT_PLAN_KEYS = ["pro_monthly", "pro_yearly", "founding_member"] as const
const PAYMENT_LANGUAGES = ["en", "tr", "es", "zh"] as const

function normalizeEshipxUrls(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const key of PAYMENT_PLAN_KEYS) {
    const raw = String(source[key] || "").trim()
    if (!raw) {
      result[key] = ""
      continue
    }
    try {
      const parsed = new URL(raw)
      // EshipX can issue its hosted checkout through Stripe Payment Links.
      // Keep the allow-list narrow: only EshipX and Stripe's official payment
      // link host are valid destinations, and HTTPS remains mandatory.
      const validHost =
        parsed.hostname === "eshipx.com" ||
        parsed.hostname.endsWith(".eshipx.com") ||
        parsed.hostname === "buy.stripe.com"
      if (parsed.protocol !== "https:" || !validHost || raw.length > 1000) return null
      result[key] = parsed.toString()
    } catch {
      return null
    }
  }
  return result
}

function normalizePlanNames(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  const result: Record<string, Record<string, string>> = {}
  for (const key of PAYMENT_PLAN_KEYS) {
    const localized = source[key]
    if (!localized || typeof localized !== "object" || Array.isArray(localized)) return null
    result[key] = {}
    for (const language of PAYMENT_LANGUAGES) {
      const label = String((localized as Record<string, unknown>)[language] || "").trim()
      if (!label || label.length > 80) return null
      result[key][language] = label
    }
  }
  return result
}

function normalizeBillingBcc(value: unknown) {
  if (value === undefined) return null
  const raw = Array.isArray(value)
    ? value.map((item) => String(item || ""))
    : typeof value === "string"
      ? value.split(/[;,\n]/)
      : null
  if (!raw) return null
  const addresses = [...new Set(raw.map((item) => item.trim().toLowerCase()).filter(Boolean))]
  if (addresses.length > 20 || addresses.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return false
  }
  return addresses
}

Deno.serve(async (request) => {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  if (!["GET", "POST"].includes(request.method)) {
    return json({ error: "Method not allowed" }, 405)
  }

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
        ((profile?.permissions || []).includes("manage_settings") ||
          (profile?.permissions || []).includes("manage_billing")))
    if (!allowed) return json({ error: "Forbidden" }, 403)

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (request.method === "GET") {
      const [statusResult, modelResult, settingsResult] = await Promise.all([
        admin.rpc("get_edge_integration_status"),
        admin.rpc("get_ai_model_settings"),
        admin.from("system_settings").select("billing_notification_bcc").limit(1).maybeSingle(),
      ])
      if (statusResult.error) return json({ error: statusResult.error.message }, 500)
      if (modelResult.error) return json({ error: modelResult.error.message }, 500)
      if (settingsResult.error) return json({ error: settingsResult.error.message }, 500)
      const status = Array.isArray(statusResult.data)
        ? statusResult.data[0] || {}
        : statusResult.data || {}
      const models = Array.isArray(modelResult.data)
        ? modelResult.data[0] || {}
        : modelResult.data || {}
      return json({ ...status, ...models, billing_notification_bcc: settingsResult.data?.billing_notification_bcc || [] })
    }

    const body = await request.json()
    const secretUpdates = [
      ["resend_api_key", body.resendApiKey],
      ["gemini_api_key", body.geminiKey],
      ["openai_api_key", body.openaiKey],
      ["r2_access_key_id", body.r2AccessKey],
      ["r2_secret_access_key", body.r2SecretKey],
    ] as const

    for (const [name, value] of secretUpdates) {
      if (typeof value === "string" && value.trim()) {
        const { error } = await admin.rpc("set_integration_secret", {
          secret_name: name,
          secret_value: value.trim(),
        })
        if (error) return json({ error: error.message }, 500)
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.activeProvider === "gemini" || body.activeProvider === "openai") {
      updates.active_provider = body.activeProvider
    }
    if (body.openaiRoutingMode === "smart" || body.openaiRoutingMode === "single") {
      updates.openai_routing_mode = body.openaiRoutingMode
    }
    if (
      body.openaiDefaultModel === "gpt-4o-mini" ||
      body.openaiDefaultModel === "gpt-5.6-luna"
    ) {
      updates.openai_default_model = body.openaiDefaultModel
    }
    if (typeof body.emailFromAddress === "string") {
      const requestedAddress = body.emailFromAddress.trim().toLowerCase()
      if (requestedAddress !== "no-reply@onpace-ai.xyz") {
        return json(
          {
            error:
              "Announcement sender must be no-reply@onpace-ai.xyz.",
          },
          400
        )
      }
      updates.email_from_address = requestedAddress
    }
    if (typeof body.emailFromName === "string" && body.emailFromName.trim()) {
      updates.email_from_name = body.emailFromName.trim()
    }
    if (typeof body.r2Endpoint === "string" && body.r2Endpoint.trim()) {
      updates.r2_endpoint = body.r2Endpoint.trim()
    }
    if (typeof body.r2BucketName === "string" && body.r2BucketName.trim()) {
      updates.r2_bucket_name = body.r2BucketName.trim()
    }
    if (typeof body.r2PublicUrl === "string" && body.r2PublicUrl.trim()) {
      updates.r2_public_url = body.r2PublicUrl.trim().replace(/\/+$/, "")
    }
    const checkoutUrls = body.paymentCheckoutUrls === undefined
      ? null
      : normalizeEshipxUrls(body.paymentCheckoutUrls)
    if (body.paymentCheckoutUrls !== undefined && !checkoutUrls) {
      return json({ error: "Payment links must be secure HTTPS EshipX or Stripe Checkout URLs." }, 400)
    }
    if (checkoutUrls) updates.payment_checkout_urls = checkoutUrls

    const planNames = body.planNames === undefined ? null : normalizePlanNames(body.planNames)
    if (body.planNames !== undefined && !planNames) {
      return json({ error: "Every package name is required in all four languages." }, 400)
    }
    if (planNames) updates.plan_names = planNames

    const billingBcc = normalizeBillingBcc(body.billingNotificationBcc)
    if (body.billingNotificationBcc !== undefined && billingBcc === false) {
      return json({ error: "Billing BCC recipients must be valid email addresses." }, 400)
    }
    if (billingBcc) updates.billing_notification_bcc = billingBcc

    if (typeof body.paymentGatewayEnabled === "boolean") {
      const { data: currentSettings } = await admin
        .from("system_settings")
        .select("payment_checkout_urls")
        .limit(1)
        .maybeSingle()
      const effectiveUrls = checkoutUrls || normalizeEshipxUrls(currentSettings?.payment_checkout_urls) || {}
      const providerReady = Object.values(effectiveUrls).some(Boolean)
      if (body.paymentGatewayEnabled && !providerReady) {
        return json({ error: "Add at least one valid EshipX or Stripe Checkout payment link before enabling payments." }, 400)
      }
      updates.payment_gateway_enabled = body.paymentGatewayEnabled
      updates.payment_provider = "eshipx"
      updates.payment_provider_configured = providerReady
    }
    if (typeof body.maintenanceMode === "boolean") {
      updates.maintenance_mode = body.maintenanceMode
    }
    if (
      body.maintenanceContent &&
      typeof body.maintenanceContent === "object" &&
      !Array.isArray(body.maintenanceContent)
    ) {
      const encoded = JSON.stringify(body.maintenanceContent)
      if (encoded.length > 50_000) {
        return json({ error: "Maintenance content is too large." }, 400)
      }
      updates.maintenance_content = body.maintenanceContent
    }
    if (body.planPrices && typeof body.planPrices === "object") {
      updates.plan_prices = body.planPrices
    }
    if (
      body.paymentDisabledMessage &&
      typeof body.paymentDisabledMessage === "object"
    ) {
      updates.payment_disabled_message = body.paymentDisabledMessage
    }
    if (typeof body.paymentProvider === "string" && body.paymentProvider.trim().toLowerCase() === "eshipx") {
      updates.payment_provider = "eshipx"
    }
    if (Number.isFinite(Number(body.maxFailedPaymentAttempts))) {
      updates.max_failed_payment_attempts = Math.max(
        1,
        Math.min(10, Number(body.maxFailedPaymentAttempts))
      )
    }
    if (Number.isFinite(Number(body.globalGraceDays))) {
      updates.global_grace_days = Math.max(
        0,
        Math.min(30, Number(body.globalGraceDays))
      )
    }

    if (Object.keys(updates).length > 1) {
      const { data: rows, error: readError } = await admin
        .from("system_settings")
        .select("id")
        .limit(1)
      if (readError) return json({ error: readError.message }, 500)

      if (rows?.[0]?.id != null) {
        const { error } = await admin
          .from("system_settings")
          .update(updates)
          .eq("id", rows[0].id)
        if (error) return json({ error: error.message }, 500)
      }
    }

    const { data, error } = await admin.rpc("get_edge_integration_status")
    if (error) return json({ error: error.message }, 500)
    return json({ success: true, ...(Array.isArray(data) ? data[0] : data) })
  } catch (error) {
    console.error("Integration config error", error)
    return json(
      { error: error instanceof Error ? error.message : "Configuration failed" },
      500
    )
  }
})
