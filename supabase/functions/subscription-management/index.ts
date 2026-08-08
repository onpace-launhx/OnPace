import { createClient } from "npm:@supabase/supabase-js@2"
import { emailShell } from "../_shared/email.ts"
import { corsPreflight, json, readProviderError } from "../_shared/http.ts"

type Language = "en" | "tr" | "es" | "zh"

const PAYMENT_PLANS = {
  pro_monthly: { plan: "pro", cycle: "monthly", fallbackPrice: 6.99 },
  pro_yearly: { plan: "pro", cycle: "yearly", fallbackPrice: 59.99 },
  founding_member: { plan: "founding", cycle: "one_time", fallbackPrice: 99 },
} as const

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
}

function languageOf(value: unknown): Language {
  return ["en", "tr", "es", "zh"].includes(String(value)) ? value as Language : "en"
}

function configuredPlanLabel(value: unknown, planKey: string, language: Language) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ""
  const plan = (value as Record<string, unknown>)[planKey]
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return ""
  const label = (plan as Record<string, unknown>)[language]
  return typeof label === "string" ? label.trim().slice(0, 80) : ""
}

function normalizeCode(value: unknown) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function addCycle(start: Date, cycle: string) {
  const result = new Date(start)
  if (cycle === "yearly") result.setUTCFullYear(result.getUTCFullYear() + 1)
  else result.setUTCMonth(result.getUTCMonth() + 1)
  return result
}

function dateText(value: string | null | undefined, language: Language) {
  if (!value) return "—"
  const locales = { en: "en-US", tr: "tr-TR", es: "es-ES", zh: "zh-CN" }
  return new Intl.DateTimeFormat(locales[language], { dateStyle: "long", timeZone: "UTC" }).format(new Date(value))
}

function dateTimeText(value: string | null | undefined, language: Language, timeZone?: string) {
  if (!value) return "—"
  const locales = { en: "en-US", tr: "tr-TR", es: "es-ES", zh: "zh-CN" }
  try {
    return new Intl.DateTimeFormat(locales[language], {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: timeZone || "UTC",
      timeZoneName: "short",
    }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat(locales[language], {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(new Date(value))
  }
}

function billingCopy(
  language: Language,
  event: "code" | "claimReceived" | "claimRejected" | "activated" | "trial" | "renewed" | "cancelled" | "reset" | "complimentary",
  values: Record<string, string>
) {
  const amount = `${values.amount || "0"} ${values.currency || "USD"}`
  const date = dateText(values.date, language)
  const localDateTime = dateTimeText(values.date, language, values.timeZone)
  const code = values.code || ""
  const plan = values.planLabel || ({
    en: { pro_monthly: "Pro Monthly", pro_yearly: "Pro Yearly", founding_member: "Founding Member", pro: "Pro", founding: "Founding Member" },
    tr: { pro_monthly: "Pro Aylık", pro_yearly: "Pro Yıllık", founding_member: "Kurucu Üye", pro: "Pro", founding: "Kurucu Üye" },
    es: { pro_monthly: "Pro Mensual", pro_yearly: "Pro Anual", founding_member: "Miembro Fundador", pro: "Pro", founding: "Miembro Fundador" },
    zh: { pro_monthly: "Pro 月度版", pro_yearly: "Pro 年度版", founding_member: "创始会员", pro: "Pro", founding: "创始会员" },
  }[language] as Record<string, string>)[values.plan] || values.plan || "OnPace"
  const cycle = ({
    en: { monthly: "monthly", yearly: "yearly", one_time: "one-time" },
    tr: { monthly: "aylık", yearly: "yıllık", one_time: "tek seferlik" },
    es: { monthly: "mensual", yearly: "anual", one_time: "pago único" },
    zh: { monthly: "每月", yearly: "每年", one_time: "一次性" },
  }[language] as Record<string, string>)[values.cycle] || values.cycle || ""
  const copies = {
    en: {
      code: ["Your OnPace activation code", "Complete your OnPace activation", `We recorded your ${amount} payment. Enter the activation code below on the Billing page.\n\nActivation code: ${code}\nValid until: ${date}`],
      claimReceived: ["We received your OnPace payment notice", "Payment is awaiting review", `We received the payment notice for your ${plan} selection. EshipX account email: ${values.payerEmail}. Our team will match the payment and notify you when access is activated.`],
      claimRejected: ["Your OnPace payment notice needs attention", "Payment could not be matched", `We could not match the payment notice for ${plan}. No subscription was activated. Please check the EshipX account email and contact support if you completed the payment.`],
      activated: ["Your OnPace plan is active", "Subscription activated", values.cycle === "one_time" ? `Thank you. Your lifetime ${plan} access is active. Amount: ${amount}. EshipX reference: ${values.reference}.` : `Thank you. Your OnPace ${plan} plan is active. Your next renewal date is ${date}. Billing frequency: ${cycle}. Amount: ${amount}. EshipX reference: ${values.reference}.`],
      trial: ["Your OnPace trial has started", "Your trial is active", `Your ${values.days}-day Pro trial has started and will continue until ${date}. Unless you cancel before then, your ${cycle} subscription will begin on that date for ${amount}.`],
      renewed: ["Your OnPace subscription was renewed", "Subscription renewed", `Thank you. Your ${plan} plan was renewed for ${amount}. The next renewal date is ${date}. EshipX reference: ${values.reference}.`],
      cancelled: ["Your OnPace subscription was cancelled", "Cancellation confirmed", `Your recurring subscription was cancelled. Your current access remains available until ${date}. Your learning data will not be deleted.`],
      reset: ["Your OnPace plan was updated", "Plan access updated", "Your account was moved to the Free plan by an administrator. Your notes, tasks, calendar, chat history, and all learning data remain safe."],
      complimentary: ["Complimentary OnPace Pro access", "Your free Pro access is active", `Complimentary Pro access has been added to your account until ${localDateTime}. This is the same moment worldwide and is shown here in your saved time zone. No payment will be taken for this access period.`],
    },
    tr: {
      code: ["OnPace aktivasyon kodunuz", "OnPace aktivasyonunuzu tamamlayın", `${amount} tutarındaki ödemeniz kaydedildi. Aşağıdaki aktivasyon kodunu Faturalandırma sayfasına girin.\n\nAktivasyon kodu: ${code}\nSon kullanım: ${date}`],
      claimReceived: ["OnPace ödeme bildiriminizi aldık", "Ödemeniz kontrol bekliyor", `${plan} paketine ait ödeme bildiriminizi aldık. EshipX hesap e-postası: ${values.payerEmail}. Ekibimiz ödemeyi eşleştirecek ve erişiminiz açıldığında sizi bilgilendirecek.`],
      claimRejected: ["OnPace ödeme bildiriminiz kontrol edilmeli", "Ödeme eşleştirilemedi", `${plan} paketi için gönderdiğiniz ödeme bildirimi eşleştirilemedi ve abonelik başlatılmadı. Ödeme yaptıysanız EshipX hesap e-postanızı kontrol edip destek ekibiyle iletişime geçin.`],
      activated: ["OnPace paketiniz aktif", "Aboneliğiniz etkinleştirildi", values.cycle === "one_time" ? `Teşekkürler. Ömür boyu ${plan} erişiminiz aktif edildi. Tutar: ${amount}. EshipX referansı: ${values.reference}.` : `Teşekkürler. OnPace ${plan} paketiniz aktif edildi. Sonraki yenileme tarihi: ${date}. Ödeme sıklığı: ${cycle}. Tutar: ${amount}. EshipX referansı: ${values.reference}.`],
      trial: ["OnPace deneme süreniz başladı", "Deneme paketiniz aktif", `${values.days} günlük Pro denemeniz başladı ve ${date} tarihine kadar devam edecek. Bu tarihten önce iptal etmezseniz ${cycle} aboneliğiniz aynı tarihte ${amount} tutarla başlayacak.`],
      renewed: ["OnPace aboneliğiniz yenilendi", "Aboneliğiniz yenilendi", `Teşekkürler. ${plan} paketiniz ${amount} tutarla yenilendi. Sonraki yenileme tarihi: ${date}. EshipX referansı: ${values.reference}.`],
      cancelled: ["OnPace aboneliğiniz iptal edildi", "İptal işlemi onaylandı", `Yinelenen aboneliğiniz iptal edildi. Mevcut erişiminiz ${date} tarihine kadar devam edecek. Çalışma verileriniz silinmeyecek.`],
      reset: ["OnPace paketiniz güncellendi", "Paket erişiminiz güncellendi", "Hesabınız yönetici tarafından Ücretsiz pakete geçirildi. Notlarınız, görevleriniz, takviminiz, sohbet geçmişiniz ve tüm çalışma verileriniz korunmaktadır."],
      complimentary: ["Ücretsiz OnPace Pro erişimi", "Ücretsiz Pro erişiminiz aktif", `Hesabınıza ${localDateTime} tarihine kadar ücretsiz Pro erişimi tanımlandı. Bu, dünya genelinde aynı bitiş anıdır ve kayıtlı saat diliminize göre gösterilmiştir. Bu erişim süresi için ödeme alınmayacaktır.`],
    },
    es: {
      code: ["Tu código de activación de OnPace", "Completa tu activación de OnPace", `Registramos tu pago de ${amount}. Introduce el código en la página de Facturación.\n\nCódigo de activación: ${code}\nVálido hasta: ${date}`],
      claimReceived: ["Recibimos tu aviso de pago de OnPace", "El pago está pendiente de revisión", `Recibimos el aviso de pago para ${plan}. Correo de la cuenta EshipX: ${values.payerEmail}. Nuestro equipo verificará el pago y te avisará cuando se active el acceso.`],
      claimRejected: ["Tu aviso de pago de OnPace requiere atención", "No se pudo vincular el pago", `No pudimos vincular el aviso de pago de ${plan} y no se activó ninguna suscripción. Comprueba el correo de EshipX y contacta con soporte si realizaste el pago.`],
      activated: ["Tu plan de OnPace está activo", "Suscripción activada", values.cycle === "one_time" ? `Gracias. Tu acceso de por vida a ${plan} está activo. Importe: ${amount}. Referencia EshipX: ${values.reference}.` : `Gracias. Tu plan ${plan} está activo. Próxima renovación: ${date}. Frecuencia: ${cycle}. Importe: ${amount}. Referencia EshipX: ${values.reference}.`],
      trial: ["Tu prueba de OnPace ha comenzado", "Tu prueba está activa", `Tu prueba Pro de ${values.days} días estará activa hasta ${date}. Si no cancelas antes, tu suscripción ${cycle} comenzará ese día por ${amount}.`],
      renewed: ["Tu suscripción de OnPace se renovó", "Suscripción renovada", `Gracias. Tu plan ${plan} se renovó por ${amount}. Próxima renovación: ${date}. Referencia EshipX: ${values.reference}.`],
      cancelled: ["Tu suscripción de OnPace fue cancelada", "Cancelación confirmada", `La renovación fue cancelada. Mantendrás el acceso hasta ${date}. Tus datos de aprendizaje no se eliminarán.`],
      reset: ["Tu plan de OnPace fue actualizado", "Acceso del plan actualizado", "Un administrador cambió tu cuenta al plan Gratuito. Tus notas, tareas, calendario, historial de chat y datos de aprendizaje siguen seguros."],
      complimentary: ["Acceso Pro gratuito de OnPace", "Tu acceso Pro gratuito está activo", `Se añadió acceso Pro gratuito a tu cuenta hasta el ${localDateTime}. Es el mismo instante en todo el mundo y se muestra según tu zona horaria guardada. No se realizará ningún cobro por este periodo.`],
    },
    zh: {
      code: ["您的 OnPace 激活码", "完成 OnPace 激活", `我们已记录您的 ${amount} 付款。请在账单页面输入以下激活码。\n\n激活码：${code}\n有效期至：${date}`],
      claimReceived: ["我们已收到您的 OnPace 付款通知", "付款正在等待审核", `我们已收到 ${plan} 套餐的付款通知。EshipX 账户邮箱：${values.payerEmail}。团队完成付款匹配后会通知您开通结果。`],
      claimRejected: ["您的 OnPace 付款通知需要处理", "无法匹配付款", `我们无法匹配 ${plan} 套餐的付款通知，因此尚未开通订阅。如果您已付款，请检查 EshipX 账户邮箱并联系支持团队。`],
      activated: ["您的 OnPace 套餐已激活", "订阅已激活", values.cycle === "one_time" ? `感谢您。您的 ${plan} 终身访问权限已激活。金额：${amount}。EshipX 参考号：${values.reference}。` : `感谢您。您的 ${plan} 套餐已激活。下次续费日期：${date}。计费周期：${cycle}。金额：${amount}。EshipX 参考号：${values.reference}。`],
      trial: ["您的 OnPace 试用已开始", "试用已激活", `您的 ${values.days} 天 Pro 试用已开始，将持续到 ${date}。如果您未在此前取消，${cycle} 订阅将在该日按 ${amount} 开始计费。`],
      renewed: ["您的 OnPace 订阅已续费", "订阅已续费", `感谢您。您的 ${plan} 套餐已按 ${amount} 续费。下次续费日期：${date}。EshipX 参考号：${values.reference}。`],
      cancelled: ["您的 OnPace 订阅已取消", "取消已确认", `您的自动续费已取消。当前访问权限将保留至 ${date}。您的学习数据不会被删除。`],
      reset: ["您的 OnPace 套餐已更新", "套餐权限已更新", "管理员已将您的账户调整为免费套餐。您的笔记、任务、日历、聊天记录和所有学习数据均会保留。"],
      complimentary: ["OnPace 免费 Pro 权限", "您的免费 Pro 权限已开通", `您的账户已获得免费 Pro 权限，有效期至 ${localDateTime}。这是全球统一的结束时刻，此处按您保存的时区显示。该权限期间不会收取费用。`],
    },
  } as const
  const [subject, heading, message] = copies[language][event]
  return { subject, heading, message }
}

async function getEmailConfig(admin: ReturnType<typeof createClient>) {
  const { data } = await admin.rpc("get_edge_integration_config")
  const config = Array.isArray(data) ? data[0] : data
  return {
    apiKey: Deno.env.get("RESEND_API_KEY") || config?.resend_api_key || "",
    from: `${Deno.env.get("SUBSCRIPTION_EMAIL_FROM_NAME") || config?.email_from_name || "OnPace Billing"} <${Deno.env.get("SUBSCRIPTION_EMAIL_FROM_ADDRESS") || "no-reply@onpace-ai.xyz"}>`,
  }
}

async function sendBillingEmail(
  admin: ReturnType<typeof createClient>,
  recipient: { email?: string | null; full_name?: string | null; language?: string | null; timezone?: string | null },
  event: "code" | "claimReceived" | "claimRejected" | "activated" | "trial" | "renewed" | "cancelled" | "reset" | "complimentary",
  values: Record<string, string>
) {
  if (!recipient.email) return { status: "skipped", id: null }
  const language = languageOf(recipient.language)
  const copy = billingCopy(language, event, { ...values, timeZone: recipient.timezone || values.timeZone || "UTC" })
  const config = await getEmailConfig(admin)
  if (!config.apiKey) return { status: "not_configured", id: null }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      from: config.from,
      to: [recipient.email],
      subject: copy.subject,
      html: emailShell({
        heading: copy.heading,
        message: `${recipient.full_name ? `${recipient.full_name},\n\n` : ""}${copy.message}`,
        buttonLabel: event === "code" ? ({ en: "Open Billing", tr: "Faturalandırmayı aç", es: "Abrir Facturación", zh: "打开账单" }[language]) : undefined,
        buttonUrl: event === "code" ? `${(Deno.env.get("APP_URL") || "https://onpace-ai.xyz").replace(/\/+$/, "")}/billing` : undefined,
      }),
      tags: [{ name: "source", value: "onpace_subscription" }, { name: "event", value: event }],
    }),
  })
  if (!response.ok) return { status: `failed: ${await readProviderError(response)}`, id: null }
  const body = await response.json().catch(() => ({}))
  return { status: "sent", id: body?.id || null }
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
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: "Unauthorized" }, 401)
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const body = await request.json()
    const action = String(body?.action || "")
    const { data: callerProfile } = await admin.from("profiles").select("role, permissions, email, full_name, language, timezone, discount_percent").eq("id", user.id).single()
    const canManage = callerProfile?.role === "super_admin" || (callerProfile?.role === "admin" && (callerProfile.permissions || []).includes("manage_billing"))

    if (action === "my_payment_claims") {
      const { data: claims, error } = await admin.from("eshipx_payment_claims")
        .select("id,plan_type,plan,billing_cycle,payer_email,quoted_amount,currency,status,provider_reference,submitted_at,reviewed_at")
        .eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(20)
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, claims })
    }

    if (action === "submit_payment_claim") {
      const planType = String(body.planType || "") as keyof typeof PAYMENT_PLANS
      const selected = PAYMENT_PLANS[planType]
      const payerEmail = String(body.payerEmail || "").trim().toLowerCase()
      if (!selected || !validEmail(payerEmail)) return json({ error: "Invalid payment claim details" }, 400)

      const { data: settings } = await admin.from("system_settings").select("plan_prices,plan_names,payment_gateway_enabled").limit(1).maybeSingle()
      if (!settings?.payment_gateway_enabled) return json({ error: "Payments are currently disabled" }, 403)
      const since = new Date(Date.now() - 86_400_000).toISOString()
      const { count: recentClaimCount } = await admin.from("eshipx_payment_claims")
        .select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("submitted_at", since)
      if ((recentClaimCount || 0) >= 5) return json({ error: "Too many payment notices; please contact support" }, 429)
      const configured = Number(settings?.plan_prices?.[planType])
      const basePrice = Number.isFinite(configured) && configured > 0 ? configured : selected.fallbackPrice
      const discount = Math.max(0, Math.min(100, Number(callerProfile?.discount_percent) || 0))
      const amount = Number((basePrice * (1 - discount / 100)).toFixed(2))
      const { data: claim, error } = await admin.from("eshipx_payment_claims").insert({
        user_id: user.id, plan_type: planType, plan: selected.plan, billing_cycle: selected.cycle,
        payer_email: payerEmail, quoted_amount: amount, currency: "USD",
        customer_note: String(body.customerNote || "").trim().slice(0, 500) || null,
      }).select("id,plan_type,plan,billing_cycle,payer_email,quoted_amount,currency,status,submitted_at").single()
      if (error) {
        if (error.code === "23505") return json({ error: "You already have a payment waiting for review" }, 409)
        return json({ error: error.message }, 400)
      }
      const email = await sendBillingEmail(admin, callerProfile, "claimReceived", {
        plan: planType,
        planLabel: configuredPlanLabel(settings?.plan_names, planType, languageOf(callerProfile?.language)),
        payerEmail,
        amount: String(amount),
        currency: "USD",
      })
      await admin.from("subscription_events").insert({ user_id: user.id, event_type: "eshipx_payment_claim_submitted", previous_plan: null, next_plan: selected.plan, note: "User submitted an EshipX payment matching request.", metadata: { claim_id: claim.id, plan_type: planType, payer_email: payerEmail, amount, currency: "USD", email }, created_by: user.id })
      return json({ success: true, claim, email })
    }

    if (action === "redeem_code") {
      const normalized = normalizeCode(body.code)
      if (normalized.length < 12) return json({ error: "Invalid activation code" }, 400)
      const hash = await sha256(normalized)
      const { data: activation } = await admin.from("subscription_activation_codes").select("*").eq("code_hash", hash).eq("status", "active").maybeSingle()
      if (!activation || activation.expires_at <= new Date().toISOString()) return json({ error: "Activation code is invalid or expired" }, 400)
      if (activation.user_id !== user.id) return json({ error: "This activation code belongs to another account" }, 403)
      const { data: subscription } = await admin.from("manual_subscriptions").select("*").eq("id", activation.subscription_id).single()
      if (!subscription || subscription.status !== "pending_activation") return json({ error: "This subscription cannot be activated" }, 409)
      const now = new Date().toISOString()
      const { error: subError } = await admin.from("manual_subscriptions").update({ status: "active", activated_at: now, activated_by: user.id, updated_by: user.id, updated_at: now }).eq("id", subscription.id).eq("status", "pending_activation")
      if (subError) return json({ error: subError.message }, 400)
      await admin.from("subscription_activation_codes").update({ status: "redeemed", redeemed_at: now, redeemed_by: user.id }).eq("id", activation.id)
      const isTrial = subscription.billing_cycle === "trial"
      await admin.from("profiles").update({ plan: subscription.plan, subscription_status: isTrial ? "trialing" : "active", billing_cycle: isTrial ? (subscription.renewal_cycle || "monthly") : subscription.billing_cycle, trial_start_at: isTrial ? subscription.period_start : null, trial_ends_at: isTrial ? subscription.period_end : null, pro_expires_at: isTrial || subscription.billing_cycle === "one_time" ? null : subscription.period_end, next_billing_date: subscription.next_renewal_at, updated_at: now }).eq("id", user.id)
      if (!isTrial) await admin.from("purchase_history").insert({ user_id: user.id, plan_type: subscription.plan, billing_cycle: subscription.billing_cycle, amount: subscription.amount, currency: subscription.currency, status: "completed", payment_provider: subscription.provider, provider_reference: subscription.provider_reference })
      const email = await sendBillingEmail(admin, callerProfile, isTrial ? "trial" : "activated", { plan: subscription.plan, days: String(subscription.trial_days || 3), cycle: subscription.renewal_cycle || subscription.billing_cycle, amount: String(subscription.amount), currency: subscription.currency, date: subscription.next_renewal_at || subscription.period_end })
      await admin.from("subscription_events").insert({ user_id: user.id, event_type: "manual_subscription_activated", previous_plan: null, next_plan: subscription.plan, note: "Activation code redeemed", metadata: { subscription_id: subscription.id, email }, created_by: user.id })
      return json({ success: true, subscription })
    }

    if (action === "sync_my_campaign_access") {
      const { data: members, error: memberError } = await admin
        .from("bulk_access_campaign_members")
        .select("campaign_id,notification_sent_at,assigned_at")
        .eq("user_id", user.id)
        .is("notification_sent_at", null)
        .order("assigned_at", { ascending: false })
        .limit(5)
      if (memberError) return json({ error: memberError.message }, 400)
      if (!members?.length) return json({ success: true, email: { status: "not_needed", id: null } })

      const campaignIds = members.map((member) => member.campaign_id)
      const { data: campaigns, error: campaignError } = await admin
        .from("bulk_access_campaigns")
        .select("id,ends_at,status")
        .in("id", campaignIds)
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString())
        .order("ends_at", { ascending: false })
        .limit(1)
      if (campaignError) return json({ error: campaignError.message }, 400)
      const campaign = campaigns?.[0]
      if (!campaign) return json({ success: true, email: { status: "not_needed", id: null } })

      const email = await sendBillingEmail(admin, callerProfile || {}, "complimentary", {
        date: campaign.ends_at,
        plan: "pro",
      })
      if (email.status === "sent") {
        await admin.from("bulk_access_campaign_members")
          .update({ notification_sent_at: new Date().toISOString() })
          .eq("campaign_id", campaign.id)
          .eq("user_id", user.id)
      }
      return json({ success: true, email, endsAt: campaign.ends_at })
    }

    if (!canManage) return json({ error: "Billing administrator permission required" }, 403)

    if (action === "list") {
      const { data: subscriptions, error } = await admin.from("manual_subscriptions").select("*, profiles!manual_subscriptions_user_id_fkey(full_name,email,language)").order("created_at", { ascending: false }).limit(250)
      if (error) return json({ error: error.message }, 400)
      const { data: claims, error: claimsError } = await admin.from("eshipx_payment_claims").select("*, profiles!eshipx_payment_claims_user_id_fkey(full_name,email,language,plan)").order("submitted_at", { ascending: false }).limit(500)
      if (claimsError) return json({ error: claimsError.message }, 400)
      const { data: operations } = await admin.from("bulk_plan_operations").select("id,action,target_filter,preview_count,status,affected_count,executed_at,created_at").order("created_at", { ascending: false }).limit(30)
      const { data: campaigns } = await admin.from("bulk_access_campaigns").select("id,plan,source_timezone,source_local_end,ends_at,auto_assign_new_users,target_filter,status,created_at").order("created_at", { ascending: false }).limit(30)
      return json({ success: true, subscriptions, claims, operations, campaigns })
    }

    if (action === "approve_payment_claim") {
      const claimId = String(body.claimId || "")
      const providerReference = String(body.providerReference || "").trim()
      const requestedAmount = body.amount === null || body.amount === undefined || body.amount === "" ? null : Number(body.amount)
      if (!claimId || providerReference.length < 3 || (requestedAmount !== null && (!Number.isFinite(requestedAmount) || requestedAmount <= 0))) return json({ error: "Valid claim, payment reference, and amount are required" }, 400)
      const { data: approvedRows, error: approvalError } = await caller.rpc("admin_approve_eshipx_payment_claim", {
        p_claim_id: claimId,
        p_provider_reference: providerReference,
        p_amount: requestedAmount,
        p_currency: String(body.currency || "USD").toUpperCase().slice(0, 3),
        p_period_start: body.periodStart || new Date().toISOString(),
        p_admin_note: String(body.adminNote || "").trim() || null,
      })
      if (approvalError) return json({ error: approvalError.message }, 400)
      const approved = Array.isArray(approvedRows) ? approvedRows[0] : approvedRows
      if (!approved) return json({ error: "Payment claim approval did not return a subscription" }, 500)
      const { data: claim } = await admin.from("eshipx_payment_claims").select("*, profiles!eshipx_payment_claims_user_id_fkey(email,full_name,language)").eq("id", claimId).single()
      const { data: paymentCatalog } = await admin.from("system_settings").select("plan_names").limit(1).maybeSingle()
      const email = await sendBillingEmail(admin, claim?.profiles || {}, "activated", {
        plan: claim?.plan_type || approved.approved_plan,
        planLabel: configuredPlanLabel(paymentCatalog?.plan_names, claim?.plan_type || approved.approved_plan, languageOf(claim?.profiles?.language)),
        cycle: approved.approved_cycle,
        amount: String(approved.approved_amount),
        currency: approved.approved_currency,
        date: approved.approved_next_renewal,
        reference: providerReference,
      })
      await admin.from("subscription_events").insert({ user_id: approved.approved_user_id, event_type: "eshipx_activation_email_processed", previous_plan: approved.approved_plan, next_plan: approved.approved_plan, metadata: { claim_id: claimId, subscription_id: approved.subscription_id, email }, created_by: user.id })
      return json({ success: true, approved, email })
    }

    if (action === "reject_payment_claim") {
      const claimId = String(body.claimId || "")
      const reason = String(body.adminNote || "").trim().slice(0, 1000)
      const { data: claim, error } = await admin.from("eshipx_payment_claims").update({ status: "rejected", admin_note: reason || null, reviewed_at: new Date().toISOString(), reviewed_by: user.id, updated_at: new Date().toISOString() }).eq("id", claimId).in("status", ["submitted", "reviewing"]).select("*, profiles!eshipx_payment_claims_user_id_fkey(email,full_name,language)").single()
      if (error || !claim) return json({ error: error?.message || "Payment claim could not be rejected" }, 400)
      const { data: paymentCatalog } = await admin.from("system_settings").select("plan_names").limit(1).maybeSingle()
      const email = await sendBillingEmail(admin, claim.profiles, "claimRejected", {
        plan: claim.plan_type,
        planLabel: configuredPlanLabel(paymentCatalog?.plan_names, claim.plan_type, languageOf(claim.profiles?.language)),
        payerEmail: claim.payer_email,
      })
      await admin.from("subscription_events").insert({ user_id: claim.user_id, event_type: "eshipx_payment_claim_rejected", previous_plan: null, next_plan: null, note: reason || "Payment could not be matched.", metadata: { claim_id: claim.id, payer_email: claim.payer_email, email }, created_by: user.id })
      return json({ success: true, email })
    }

    if (action === "create") {
      const userId = String(body.userId || "")
      const amount = Number(body.amount)
      const cycle = String(body.billingCycle || "monthly")
      const plan = String(body.plan || "pro")
      const trialDays = Math.max(0, Math.min(365, Number(body.trialDays) || 0))
      const providerReference = String(body.providerReference || "").trim()
      if (!userId || !Number.isFinite(amount) || amount < 0 || !["monthly", "yearly", "one_time"].includes(cycle) || !["pro", "founding"].includes(plan)) return json({ error: "Invalid subscription details" }, 400)
      if (providerReference.length < 3) return json({ error: "A payment reference is required for every paid membership" }, 400)
      const { data: target } = await admin.from("profiles").select("id,email,full_name,language,timezone").eq("id", userId).single()
      if (!target) return json({ error: "User not found" }, 404)
      const currency = String(body.currency || "USD").toUpperCase().slice(0, 3)
      const { data: activatedRows, error: activationError } = await caller.rpc("admin_create_direct_membership", {
        p_user_id: userId,
        p_plan: plan,
        p_billing_cycle: cycle,
        p_amount: amount,
        p_currency: currency,
        p_provider_reference: providerReference || null,
        p_trial_days: trialDays || null,
        p_admin_note: String(body.note || "").trim() || null,
      })
      if (activationError) return json({ error: activationError.message }, 400)
      const activated = Array.isArray(activatedRows) ? activatedRows[0] : activatedRows
      if (!activated) return json({ error: "Membership activation did not return a record" }, 500)
      const planType = plan === "founding" ? "founding_member" : cycle === "yearly" ? "pro_yearly" : "pro_monthly"
      const { data: paymentCatalog } = await admin.from("system_settings").select("plan_names").limit(1).maybeSingle()
      const email = await sendBillingEmail(admin, target, trialDays ? "trial" : "activated", {
        plan: planType,
        planLabel: configuredPlanLabel(paymentCatalog?.plan_names, planType, languageOf(target.language)),
        days: String(trialDays),
        cycle,
        amount: String(amount),
        currency,
        date: trialDays ? activated.activated_trial_end : activated.activated_next_billing,
        reference: providerReference || "—",
      })
      await admin.from("subscription_events").insert({ user_id: userId, event_type: "direct_activation_email_processed", previous_plan: plan, next_plan: plan, metadata: { subscription_id: activated.subscription_id, trial_days: trialDays || null, email }, created_by: user.id })
      return json({ success: true, activated, email })
    }

    if (action === "renew" || action === "cancel") {
      const { data: subscription } = await admin.from("manual_subscriptions").select("*, profiles!manual_subscriptions_user_id_fkey(email,full_name,language)").eq("id", String(body.subscriptionId || "")).single()
      if (!subscription) return json({ error: "Subscription not found" }, 404)
      const now = new Date().toISOString()
      if (action === "renew") {
        const providerReference = String(body.providerReference || "").trim()
        const requestedAmount = body.amount === null || body.amount === undefined || body.amount === "" ? null : Number(body.amount)
        if (providerReference.length < 3 || (requestedAmount !== null && (!Number.isFinite(requestedAmount) || requestedAmount <= 0))) {
          return json({ error: "A new unique EshipX reference and valid amount are required for every renewal" }, 400)
        }
        const { data: renewedRows, error: renewalError } = await caller.rpc("admin_renew_eshipx_subscription", {
          p_subscription_id: subscription.id,
          p_provider_reference: providerReference,
          p_amount: requestedAmount,
          p_currency: String(body.currency || subscription.currency || "USD").toUpperCase().slice(0, 3),
          p_period_end: body.periodEnd || null,
          p_admin_note: String(body.adminNote || "").trim() || null,
        })
        if (renewalError) return json({ error: renewalError.message }, 400)
        const renewed = Array.isArray(renewedRows) ? renewedRows[0] : renewedRows
        if (!renewed) return json({ error: "Renewal did not return a subscription" }, 500)
        const renewedPlanType = renewed.renewed_plan === "founding"
          ? "founding_member"
          : renewed.renewed_cycle === "yearly" ? "pro_yearly" : "pro_monthly"
        const { data: paymentCatalog } = await admin.from("system_settings").select("plan_names").limit(1).maybeSingle()
        const email = await sendBillingEmail(admin, subscription.profiles, "renewed", {
          plan: renewed.renewed_plan,
          planLabel: configuredPlanLabel(paymentCatalog?.plan_names, renewedPlanType, languageOf(subscription.profiles?.language)),
          cycle: renewed.renewed_cycle,
          amount: String(renewed.renewed_amount),
          currency: renewed.renewed_currency,
          date: renewed.renewed_period_end,
          reference: providerReference,
        })
        await admin.from("subscription_events").insert({ user_id: subscription.user_id, event_type: "eshipx_renewal_email_processed", previous_plan: subscription.plan, next_plan: subscription.plan, metadata: { subscription_id: subscription.id, provider_reference: providerReference, email }, created_by: user.id })
        return json({ success: true, renewed, email })
      }
      const effective = body.effectiveAt ? new Date(body.effectiveAt) : new Date(subscription.period_end || Date.now())
      const immediate = effective <= new Date()
      await admin.from("manual_subscriptions").update({ status: immediate ? "canceled" : "cancel_at_period_end", cancel_at_period_end: !immediate, canceled_at: now, cancellation_effective_at: effective.toISOString(), next_renewal_at: null, updated_by: user.id, updated_at: now }).eq("id", subscription.id)
      await admin.from("profiles").update(immediate ? { plan: "free", subscription_status: "none", billing_cycle: "none", pro_expires_at: null, next_billing_date: null, updated_at: now } : { subscription_status: "cancel_at_period_end", pro_expires_at: effective.toISOString(), next_billing_date: null, updated_at: now }).eq("id", subscription.user_id)
      const email = await sendBillingEmail(admin, subscription.profiles, "cancelled", { date: effective.toISOString() })
      await admin.from("subscription_events").insert({ user_id: subscription.user_id, event_type: immediate ? "manual_subscription_canceled" : "manual_subscription_cancel_scheduled", previous_plan: subscription.plan, next_plan: immediate ? "free" : subscription.plan, metadata: { subscription_id: subscription.id, effective_at: effective.toISOString(), email }, created_by: user.id })
      return json({ success: true, email })
    }

    if (action === "bulk_preview") {
      const mode = body.mode === "grant" ? "grant" : "reset"
      const requestedTargetPlan = ["all", "free", "pro", "founding"].includes(String(body.targetPlan)) ? String(body.targetPlan) : "all"
      // Complimentary access must never overwrite a paid plan. The admin first
      // resets/cancels plans, then grants the campaign to the resulting Free users.
      const targetPlan = mode === "grant" ? "free" : requestedTargetPlan
      let query = admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")
      if (targetPlan !== "all") query = query.eq("plan", targetPlan)
      const { count, error } = await query
      if (error) return json({ error: error.message }, 400)
      const previewCount = count || 0
      let endsAtUtc: string | null = null
      const endsAtEastern = String(body.endsAtEastern || "")
      if (mode === "grant") {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endsAtEastern)) return json({ error: "A valid Eastern Time campaign end is required" }, 400)
        const { data: resolved, error: resolveError } = await caller.rpc("resolve_eastern_time", { p_local: endsAtEastern })
        if (resolveError) return json({ error: resolveError.message }, 400)
        endsAtUtc = String(resolved)
        if (new Date(endsAtUtc) <= new Date()) return json({ error: "Campaign end must be in the future" }, 400)
      }
      const token = crypto.randomUUID() + crypto.randomUUID()
      const { data: operation, error: insertError } = await admin.from("bulk_plan_operations").insert({
        requested_by: user.id,
        action: mode === "grant" ? "start_trial" : "reset_to_free",
        target_filter: {
          plan: targetPlan,
          mode,
          ends_at_eastern: mode === "grant" ? endsAtEastern : null,
          ends_at_utc: endsAtUtc,
          auto_assign_new_users: mode === "grant" && body.autoAssignNewUsers === true,
        },
        preview_count: previewCount,
        confirmation_hash: await sha256(token),
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      }).select("id").single()
      if (insertError) return json({ error: insertError.message }, 400)
      return json({
        success: true,
        operationId: operation.id,
        previewCount,
        previewToken: token,
        confirmationText: mode === "grant" ? `GRANT ${previewCount} PLANS` : `RESET ${previewCount} PLANS`,
        endsAtUtc,
      })
    }

    if (action === "bulk_execute") {
      const token = String(body.previewToken || "")
      const { data: operation } = await admin.from("bulk_plan_operations").select("*").eq("id", String(body.operationId || "")).eq("requested_by", user.id).eq("confirmation_hash", await sha256(token)).eq("status", "preview").single()
      if (!operation || operation.expires_at <= new Date().toISOString()) return json({ error: "Bulk preview expired; create a new preview" }, 409)
      const isGrant = operation.action === "start_trial"
      const expectedConfirmation = isGrant ? `GRANT ${operation.preview_count} PLANS` : `RESET ${operation.preview_count} PLANS`
      if (String(body.confirmation || "") !== expectedConfirmation) return json({ error: "Confirmation text does not match" }, 400)
      let targetQuery = admin.from("profiles").select("id,email,full_name,language,timezone,plan").eq("role", "student")
      const filterPlan = String(operation.target_filter?.plan || "all")
      if (filterPlan !== "all") targetQuery = targetQuery.eq("plan", filterPlan)
      const { data: targets, error } = await targetQuery
      if (error) return json({ error: error.message }, 400)
      if ((targets || []).length !== operation.preview_count) return json({ error: "Target count changed; create a new preview" }, 409)
      const now = new Date().toISOString()

      if (isGrant) {
        const endsAtEastern = String(operation.target_filter?.ends_at_eastern || "")
        const autoAssign = operation.target_filter?.auto_assign_new_users === true
        const { data: campaignRows, error: campaignError } = await caller.rpc("admin_create_bulk_access_campaign", {
          p_ends_at_eastern: endsAtEastern,
          p_auto_assign_new_users: autoAssign,
          p_target_plan: filterPlan,
        })
        if (campaignError) return json({ error: campaignError.message }, 400)
        const campaign = Array.isArray(campaignRows) ? campaignRows[0] : campaignRows
        if (!campaign) return json({ error: "Campaign creation did not return a record" }, 500)

        const { data: recipients } = await admin.from("profiles")
          .select("id,email,full_name,language,timezone")
          .in("id", targets!.map((target) => target.id))
        for (let index = 0; index < (recipients || []).length; index += 20) {
          const group = recipients!.slice(index, index + 20)
          const delivered = await Promise.all(group.map(async (target) => ({
            id: target.id,
            email: await sendBillingEmail(admin, target, "complimentary", { date: campaign.ends_at_utc, plan: "pro" }),
          })))
          const sentIds = delivered.filter((entry) => entry.email.status === "sent").map((entry) => entry.id)
          if (sentIds.length) {
            await admin.from("bulk_access_campaign_members")
              .update({ notification_sent_at: now })
              .eq("campaign_id", campaign.campaign_id)
              .in("user_id", sentIds)
          }
        }
        await admin.from("bulk_plan_operations").update({ status: "completed", affected_count: campaign.affected_count, executed_at: now }).eq("id", operation.id)
        return json({ success: true, affectedCount: campaign.affected_count, campaign, endsAtUtc: campaign.ends_at_utc })
      }

      if (filterPlan === "all") {
        await admin.from("bulk_access_campaigns")
          .update({ status: "canceled", auto_assign_new_users: false, updated_at: now })
          .eq("status", "active")
      }

      for (let index = 0; index < (targets || []).length; index += 400) {
        const group = targets!.slice(index, index + 400)
        const ids = group.map((target) => target.id)
        await admin.from("profiles").update({ plan: "free", subscription_status: "none", billing_cycle: "none", trial_start_at: null, trial_ends_at: null, pro_expires_at: null, next_billing_date: null, active_promocode: null, promocode_expires_at: null, discount_percent: 0, complimentary_campaign_id: null, updated_at: now }).in("id", ids)
        await admin.from("manual_subscriptions").update({ status: "canceled", cancel_at_period_end: false, canceled_at: now, cancellation_effective_at: now, next_renewal_at: null, updated_by: user.id, updated_at: now }).in("user_id", ids).in("status", ["pending_activation", "active", "cancel_at_period_end"])
        await admin.from("bulk_access_campaign_members").update({ notification_sent_at: now }).in("user_id", ids).is("notification_sent_at", null)
        await admin.from("subscription_events").insert(group.map((target) => ({ user_id: target.id, event_type: "bulk_plan_reset_to_free", previous_plan: target.plan, next_plan: "free", note: "Plan fields reset; all learning data preserved.", metadata: { operation_id: operation.id }, created_by: user.id })))
        for (let emailIndex = 0; emailIndex < group.length; emailIndex += 20) {
          await Promise.all(group.slice(emailIndex, emailIndex + 20).map((target) => sendBillingEmail(admin, target, "reset", {})))
        }
      }
      await admin.from("bulk_plan_operations").update({ status: "completed", affected_count: (targets || []).length, executed_at: now }).eq("id", operation.id)
      return json({ success: true, affectedCount: (targets || []).length })
    }

    return json({ error: "Unsupported action" }, 400)
  } catch (error) {
    console.error("Subscription management error", error)
    return json({ error: error instanceof Error ? error.message : "Subscription operation failed" }, 500)
  }
})
