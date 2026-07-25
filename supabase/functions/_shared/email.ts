export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function localizedAuthCopy(action: string, language: string) {
  type SupportedLanguage = "tr" | "en" | "es" | "zh"
  type AuthAction = "signup" | "recovery" | "magiclink" | "email_change"
  const lang: SupportedLanguage = ["tr", "en", "es", "zh"].includes(language)
    ? (language as SupportedLanguage)
    : "en"
  const copy = {
    en: {
      signup: ["Confirm your OnPace email", "Welcome to OnPace", "Confirm your email address to activate your account.", "Confirm email"],
      recovery: ["Reset your OnPace password", "Password reset", "Use the secure button below to choose a new password.", "Reset password"],
      magiclink: ["Your OnPace sign-in link", "Sign in to OnPace", "Use this secure link to sign in to your account.", "Sign in"],
      email_change: ["Confirm your new email", "Email change request", "Confirm this email address to complete the change.", "Confirm email"],
    },
    tr: {
      signup: ["OnPace e-posta adresinizi doğrulayın", "OnPace'e hoş geldiniz", "Hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın.", "E-postayı doğrula"],
      recovery: ["OnPace şifrenizi sıfırlayın", "Şifre sıfırlama", "Yeni bir şifre belirlemek için aşağıdaki güvenli düğmeyi kullanın.", "Şifreyi sıfırla"],
      magiclink: ["OnPace giriş bağlantınız", "OnPace'e giriş yapın", "Hesabınıza giriş yapmak için bu güvenli bağlantıyı kullanın.", "Giriş yap"],
      email_change: ["Yeni e-postanızı doğrulayın", "E-posta değişikliği", "Değişikliği tamamlamak için bu e-posta adresini doğrulayın.", "E-postayı doğrula"],
    },
    es: {
      signup: ["Confirma tu correo de OnPace", "Te damos la bienvenida a OnPace", "Confirma tu correo para activar tu cuenta.", "Confirmar correo"],
      recovery: ["Restablece tu contraseña de OnPace", "Restablecer contraseña", "Usa el botón seguro para elegir una nueva contraseña.", "Restablecer contraseña"],
      magiclink: ["Tu enlace de acceso a OnPace", "Inicia sesión en OnPace", "Usa este enlace seguro para acceder a tu cuenta.", "Iniciar sesión"],
      email_change: ["Confirma tu nuevo correo", "Cambio de correo", "Confirma esta dirección para completar el cambio.", "Confirmar correo"],
    },
    zh: {
      signup: ["验证您的 OnPace 邮箱", "欢迎使用 OnPace", "请验证邮箱以激活您的账户。", "验证邮箱"],
      recovery: ["重置 OnPace 密码", "密码重置", "请使用下方安全按钮设置新密码。", "重置密码"],
      magiclink: ["您的 OnPace 登录链接", "登录 OnPace", "请使用此安全链接登录您的账户。", "登录"],
      email_change: ["验证您的新邮箱", "邮箱变更", "请验证此邮箱以完成变更。", "验证邮箱"],
    },
  } as const

  const actionKey: AuthAction =
    action === "recovery" || action === "magiclink" || action === "email_change"
      ? action
      : "signup"
  const [subject, heading, message, button] = copy[lang][actionKey]
  const extras = {
    en: {
      codeLabel: "Security code",
      tagline: "AI-powered study platform",
      footer: "OnPace. All rights reserved.",
    },
    tr: {
      codeLabel: "Güvenlik kodu",
      tagline: "Yapay zeka destekli çalışma platformu",
      footer: "OnPace. Tüm hakları saklıdır.",
    },
    es: {
      codeLabel: "Código de seguridad",
      tagline: "Plataforma de estudio con IA",
      footer: "OnPace. Todos los derechos reservados.",
    },
    zh: {
      codeLabel: "安全验证码",
      tagline: "AI 驱动的学习平台",
      footer: "OnPace。保留所有权利。",
    },
  } as const
  return { subject, heading, message, button, ...extras[lang] }
}

export function emailShell(options: {
  heading: string
  message: string
  buttonLabel?: string
  buttonUrl?: string
  token?: string
  preheader?: string
  codeLabel?: string
  tagline?: string
  footer?: string
}) {
  const button =
    options.buttonLabel && options.buttonUrl
      ? `<a href="${escapeHtml(options.buttonUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:10px">${escapeHtml(options.buttonLabel)}</a>`
      : ""
  const token = options.token
    ? `<p style="color:#64748b;font-size:13px;line-height:1.6;margin-top:24px">${escapeHtml(options.codeLabel || "Security code")}<br><strong style="font-size:22px;letter-spacing:4px;color:#0f172a">${escapeHtml(options.token)}</strong></p>`
    : ""

  return `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif">
<span style="display:none!important;opacity:0">${escapeHtml(options.preheader || options.message)}</span>
<div style="max-width:600px;margin:0 auto;padding:28px 18px">
  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:25px;font-weight:800;color:#4f46e5">OnPace</div>
    <div style="color:#64748b;font-size:12px;margin-top:5px">${escapeHtml(options.tagline || "AI-powered study platform")}</div>
  </div>
  <div style="background:#fff;padding:32px;border-radius:16px;border:1px solid #e2e8f0;text-align:center">
    <h1 style="font-size:21px;color:#0f172a;margin:0 0 14px">${escapeHtml(options.heading)}</h1>
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px">${escapeHtml(options.message).replaceAll("\n", "<br>")}</p>
    ${button}${token}
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">© ${escapeHtml(options.footer || "OnPace. All rights reserved.")}</p>
</div></body></html>`
}
