import { createClient } from "npm:@supabase/supabase-js@2"
import { emailShell } from "../_shared/email.ts"
import { corsPreflight, json, readProviderError } from "../_shared/http.ts"

type Language = "en" | "tr" | "es" | "zh"

const COPY = {
  en: {
    subject: "Confirm your new OnPace email",
    heading: "Confirm your email change",
    message: "Enter this one-time code in OnPace to confirm your new email address. The code expires in 10 minutes.",
    codeLabel: "Email change code",
    tagline: "Secure account notification",
    footer: "OnPace. All rights reserved.",
  },
  tr: {
    subject: "Yeni OnPace e-postanızı doğrulayın",
    heading: "E-posta değişikliğini doğrulayın",
    message: "Yeni e-posta adresinizi doğrulamak için bu tek kullanımlık kodu OnPace'e girin. Kodun süresi 10 dakika sonra dolar.",
    codeLabel: "E-posta değişiklik kodu",
    tagline: "Güvenli hesap bildirimi",
    footer: "OnPace. Tüm hakları saklıdır.",
  },
  es: {
    subject: "Confirma tu nuevo correo de OnPace",
    heading: "Confirma el cambio de correo",
    message: "Introduce este código de un solo uso en OnPace para confirmar tu nuevo correo. El código caduca en 10 minutos.",
    codeLabel: "Código de cambio de correo",
    tagline: "Notificación de cuenta segura",
    footer: "OnPace. Todos los derechos reservados.",
  },
  zh: {
    subject: "验证您的新 OnPace 邮箱",
    heading: "确认邮箱变更",
    message: "请在 OnPace 中输入此一次性验证码以确认新邮箱。验证码将在 10 分钟后过期。",
    codeLabel: "邮箱变更验证码",
    tagline: "安全账户通知",
    footer: "OnPace。保留所有权利。",
  },
} as const

function normalizeLanguage(value: unknown): Language {
  return value === "tr" || value === "es" || value === "zh" ? value : "en"
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function createOtp() {
  const random = new Uint32Array(1)
  crypto.getRandomValues(random)
  return String(random[0] % 1_000_000).padStart(6, "0")
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
    const { data: { user } } = await caller.auth.getUser()
    if (!user?.email) return json({ error: "Unauthorized" }, 401)

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const body = await request.json()
    const action = body.action === "verify" ? "verify" : "request"
    const newEmail = String(body.newEmail || "").trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return json({ error: "Enter a valid email address." }, 400)
    }
    if (newEmail === user.email.toLowerCase()) {
      return json({ error: "The new email must be different." }, 400)
    }

    if (action === "request") {
      const language = normalizeLanguage(body.language || user.user_metadata?.language)
      const otp = createOtp()
      const tokenHash = await sha256(otp)
      await admin
        .from("email_change_requests")
        .update({ consumed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("consumed_at", null)

      const { error: requestError } = await admin
        .from("email_change_requests")
        .insert({
          user_id: user.id,
          old_email: user.email.toLowerCase(),
          new_email: newEmail,
          token_hash: tokenHash,
          language,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
      if (requestError) return json({ error: requestError.message }, 400)

      const { data: configData } = await admin.rpc("get_edge_integration_config")
      const config = Array.isArray(configData) ? configData[0] : configData
      const apiKey = Deno.env.get("RESEND_API_KEY") || config?.resend_api_key
      if (!apiKey) return json({ error: "Resend is not configured" }, 503)
      const copy = COPY[language]
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${Deno.env.get("SECURITY_EMAIL_FROM_NAME") || "OnPace Security"} <${Deno.env.get("SECURITY_EMAIL_FROM_ADDRESS") || "security@onpace-ai.xyz"}>`,
          to: [newEmail],
          subject: copy.subject,
          html: emailShell({
            heading: copy.heading,
            message: copy.message,
            token: otp,
            codeLabel: copy.codeLabel,
            tagline: copy.tagline,
            footer: copy.footer,
            preheader: copy.message,
          }),
          tags: [
            { name: "source", value: "onpace_security" },
            { name: "auth_action", value: "custom_email_change" },
          ],
        }),
      })
      if (!resendResponse.ok) {
        return json({ error: await readProviderError(resendResponse) }, 502)
      }
      return json({ success: true })
    }

    const token = String(body.token || "").replace(/\D/g, "")
    if (token.length !== 6) return json({ error: "Enter the 6-digit code." }, 400)
    const { data: pending } = await admin
      .from("email_change_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("new_email", newEmail)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!pending || new Date(pending.expires_at) <= new Date()) {
      return json({ error: "Code expired. Request a new code." }, 400)
    }
    if (pending.attempts >= 5) {
      return json({ error: "Too many attempts. Request a new code." }, 429)
    }
    if ((await sha256(token)) !== pending.token_hash) {
      await admin
        .from("email_change_requests")
        .update({ attempts: pending.attempts + 1 })
        .eq("id", pending.id)
      return json({ error: "Invalid verification code." }, 400)
    }

    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    })
    if (authError) return json({ error: authError.message }, 400)

    await Promise.all([
      admin.from("profiles").update({ email: newEmail }).eq("id", user.id),
      admin
        .from("email_change_requests")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", pending.id),
    ])
    return json({ success: true, email: newEmail })
  } catch (error) {
    console.error("Account email change error", error)
    return json(
      { error: error instanceof Error ? error.message : "Email change failed" },
      500
    )
  }
})
