import { createClient } from "npm:@supabase/supabase-js@2"
import { Webhook } from "npm:standardwebhooks@1"
import {
  emailShell,
  localizedAuthCopy,
  localizedSecurityCopy,
} from "../_shared/email.ts"
import { json, readProviderError } from "../_shared/http.ts"

function hookError(message: string, httpCode = 500) {
  // Supabase Auth Hooks expect this nested shape. Returning a plain string
  // makes supabase-js surface an unhelpful `{}` error to the browser.
  return json({ error: { http_code: httpCode, message } }, httpCode)
}

interface HookPayload {
  user: {
    email: string
    phone?: string
    new_email?: string
    user_metadata?: { language?: string; locale?: string }
  }
  email_data: {
    token?: string
    token_hash?: string
    redirect_to?: string
    email_action_type: string
    token_new?: string
    token_hash_new?: string
    old_email?: string
    old_phone?: string
    provider?: string
    factor_type?: string
  }
}

async function getEmailConfig() {
  let apiKey = Deno.env.get("RESEND_API_KEY") || ""
  const fromAddress =
    Deno.env.get("SECURITY_EMAIL_FROM_ADDRESS") || "security@onpace-ai.xyz"
  const fromName =
    Deno.env.get("SECURITY_EMAIL_FROM_NAME") || "OnPace Security"

  if (!apiKey) {
    const url = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (url && serviceKey) {
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data } = await admin.rpc("get_edge_integration_config")
      const config = Array.isArray(data) ? data[0] : data
      apiKey = config?.resend_api_key || ""
    }
  }

  return { apiKey, fromAddress, fromName }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return hookError("Method not allowed", 405)
  }

  try {
    const rawBody = await request.text()
    const hookSecret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "")
      .replace("v1,whsec_", "")

    if (!hookSecret) {
      return hookError("SEND_EMAIL_HOOK_SECRET is not configured", 500)
    }

    const payload = new Webhook(hookSecret).verify(
      rawBody,
      Object.fromEntries(request.headers)
    ) as HookPayload
    const { apiKey, fromAddress, fromName } = await getEmailConfig()

    if (!apiKey) {
      return hookError("Resend is not configured", 500)
    }

    const action = payload.email_data.email_action_type
    const language =
      payload.user.user_metadata?.language ||
      payload.user.user_metadata?.locale ||
      "en"
    const emailData = payload.email_data
    const isSecurityNotification = action.endsWith("_notification")
    const copy = isSecurityNotification
      ? localizedSecurityCopy(action, language, {
          oldEmail: emailData.old_email,
          email: payload.user.email,
          oldPhone: emailData.old_phone,
          phone: payload.user.phone,
          provider: emailData.provider,
          factorType: emailData.factor_type,
        })
      : localizedAuthCopy(action, language)
    const targets: Array<{ to: string; token?: string; tokenHash?: string }> = []

    // Supabase intentionally reverses the *_new hash naming for secure email
    // change. The current address uses token_hash_new; the new address uses
    // token_hash. Both confirmations are required when secure change is enabled.
    if (isSecurityNotification) {
      targets.push({ to: payload.user.email })
    } else if (
      action === "email_change" &&
      payload.user.new_email &&
      emailData.token_hash_new
    ) {
      targets.push({
        to: payload.user.email,
        token: emailData.token,
        tokenHash: emailData.token_hash_new,
      })
      targets.push({
        to: payload.user.new_email,
        token: emailData.token_new || emailData.token,
        tokenHash: emailData.token_hash,
      })
    } else {
      targets.push({
        to:
          action === "email_change"
            ? payload.user.new_email || payload.user.email
            : payload.user.email,
        token: emailData.token_new || emailData.token,
        tokenHash: emailData.token_hash,
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const responses = await Promise.all(
      targets.map((target) => {
        const verifyUrl = target.tokenHash
          ? `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(target.tokenHash)}` +
            `&type=${encodeURIComponent(action)}` +
            `&redirect_to=${encodeURIComponent(emailData.redirect_to || "")}`
          : undefined

        return fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${fromName} <${fromAddress}>`,
            to: [target.to],
            subject: copy.subject,
            html: emailShell({
              heading: copy.heading,
              message: copy.message,
              buttonLabel: "button" in copy ? copy.button : undefined,
              buttonUrl: verifyUrl,
              token: action === "recovery" ? undefined : target.token,
              preheader: copy.message,
              codeLabel: "codeLabel" in copy ? copy.codeLabel : undefined,
              tagline: copy.tagline,
              footer: copy.footer,
            }),
            tags: [
              { name: "source", value: "onpace_security" },
              { name: "auth_action", value: action },
            ],
          }),
        })
      })
    )

    for (const resendResponse of responses) {
      if (!resendResponse.ok) {
        return hookError(
          `Resend: ${await readProviderError(resendResponse)}`,
          502
        )
      }
    }

    return json({})
  } catch (error) {
    console.error("Auth email hook error", error)
    return hookError(
      error instanceof Error ? error.message : "Invalid hook request",
      401
    )
  }
})
