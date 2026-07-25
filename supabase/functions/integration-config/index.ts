import { createClient } from "npm:@supabase/supabase-js@2"
import { corsPreflight, json } from "../_shared/http.ts"

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
        (profile?.permissions || []).includes("manage_settings"))
    if (!allowed) return json({ error: "Forbidden" }, 403)

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (request.method === "GET") {
      const { data, error } = await admin.rpc("get_edge_integration_status")
      if (error) return json({ error: error.message }, 500)
      return json(Array.isArray(data) ? data[0] || {} : data || {})
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
    if (typeof body.emailFromAddress === "string" && body.emailFromAddress.trim()) {
      updates.email_from_address = body.emailFromAddress.trim().toLowerCase()
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
    if (typeof body.paymentGatewayEnabled === "boolean") {
      if (body.paymentGatewayEnabled) {
        const { data: currentSettings } = await admin
          .from("system_settings")
          .select("payment_provider_configured")
          .limit(1)
          .maybeSingle()
        const providerReady =
          body.paymentProviderConfigured === true ||
          currentSettings?.payment_provider_configured === true
        if (!providerReady) {
          return json(
            {
              error:
                "Configure and verify a payment provider before enabling real payments.",
            },
            400
          )
        }
      }
      updates.payment_gateway_enabled = body.paymentGatewayEnabled
    }
    if (typeof body.maintenanceMode === "boolean") {
      updates.maintenance_mode = body.maintenanceMode
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
    if (typeof body.paymentProvider === "string") {
      updates.payment_provider = body.paymentProvider.trim() || "unconfigured"
    }
    if (typeof body.paymentProviderConfigured === "boolean") {
      updates.payment_provider_configured = body.paymentProviderConfigured
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
