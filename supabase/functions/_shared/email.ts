export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function formatEmailMessage(value: unknown) {
  return escapeHtml(value)
    .replace(
      /https?:\/\/[^\s<]+/g,
      (url) =>
        `<a href="${url}" style="color:#4f46e5;font-weight:700;text-decoration:underline">${url}</a>`
    )
    .replaceAll("\n", "<br>")
}

export function localizedAuthCopy(action: string, language: string) {
  type SupportedLanguage = "tr" | "en" | "es" | "zh"
  type AuthAction =
    | "signup"
    | "invite"
    | "recovery"
    | "magiclink"
    | "reauthentication"
    | "email_change"
  const lang: SupportedLanguage = ["tr", "en", "es", "zh"].includes(language)
    ? (language as SupportedLanguage)
    : "en"
  const copy = {
    en: {
      signup: ["Confirm your OnPace email", "Welcome to OnPace", "Confirm your email address to activate your account.", "Confirm email"],
      invite: ["You are invited to OnPace", "Your OnPace invitation", "Accept this invitation to create your account.", "Accept invitation"],
      recovery: ["Reset your OnPace password", "Password reset", "Use the secure button below to choose a new password.", "Reset password"],
      magiclink: ["Your OnPace sign-in link", "Sign in to OnPace", "Use this secure link to sign in to your account.", "Sign in"],
      reauthentication: ["Your OnPace security code", "Verify your identity", "Use this one-time code to continue securely.", "Verify"],
      email_change: ["Confirm your new email", "Email change request", "Confirm this email address to complete the change.", "Confirm email"],
    },
    tr: {
      signup: ["OnPace e-posta adresinizi doğrulayın", "OnPace'e hoş geldiniz", "Hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın.", "E-postayı doğrula"],
      invite: ["OnPace'e davet edildiniz", "OnPace davetiniz", "Hesabınızı oluşturmak için bu daveti kabul edin.", "Daveti kabul et"],
      recovery: ["OnPace şifrenizi sıfırlayın", "Şifre sıfırlama", "Yeni bir şifre belirlemek için aşağıdaki güvenli düğmeyi kullanın.", "Şifreyi sıfırla"],
      magiclink: ["OnPace giriş bağlantınız", "OnPace'e giriş yapın", "Hesabınıza giriş yapmak için bu güvenli bağlantıyı kullanın.", "Giriş yap"],
      reauthentication: ["OnPace güvenlik kodunuz", "Kimliğinizi doğrulayın", "Güvenle devam etmek için bu tek kullanımlık kodu kullanın.", "Doğrula"],
      email_change: ["Yeni e-postanızı doğrulayın", "E-posta değişikliği", "Değişikliği tamamlamak için bu e-posta adresini doğrulayın.", "E-postayı doğrula"],
    },
    es: {
      signup: ["Confirma tu correo de OnPace", "Te damos la bienvenida a OnPace", "Confirma tu correo para activar tu cuenta.", "Confirmar correo"],
      invite: ["Te han invitado a OnPace", "Tu invitación a OnPace", "Acepta esta invitación para crear tu cuenta.", "Aceptar invitación"],
      recovery: ["Restablece tu contraseña de OnPace", "Restablecer contraseña", "Usa el botón seguro para elegir una nueva contraseña.", "Restablecer contraseña"],
      magiclink: ["Tu enlace de acceso a OnPace", "Inicia sesión en OnPace", "Usa este enlace seguro para acceder a tu cuenta.", "Iniciar sesión"],
      reauthentication: ["Tu código de seguridad de OnPace", "Verifica tu identidad", "Usa este código de un solo uso para continuar de forma segura.", "Verificar"],
      email_change: ["Confirma tu nuevo correo", "Cambio de correo", "Confirma esta dirección para completar el cambio.", "Confirmar correo"],
    },
    zh: {
      signup: ["验证您的 OnPace 邮箱", "欢迎使用 OnPace", "请验证邮箱以激活您的账户。", "验证邮箱"],
      invite: ["您已受邀加入 OnPace", "您的 OnPace 邀请", "接受此邀请以创建您的账户。", "接受邀请"],
      recovery: ["重置 OnPace 密码", "密码重置", "请使用下方安全按钮设置新密码。", "重置密码"],
      magiclink: ["您的 OnPace 登录链接", "登录 OnPace", "请使用此安全链接登录您的账户。", "登录"],
      reauthentication: ["您的 OnPace 安全验证码", "验证您的身份", "请使用此一次性验证码安全地继续。", "验证"],
      email_change: ["验证您的新邮箱", "邮箱变更", "请验证此邮箱以完成变更。", "验证邮箱"],
    },
  } as const

  const supportedActions: AuthAction[] = [
    "signup",
    "invite",
    "recovery",
    "magiclink",
    "reauthentication",
    "email_change",
  ]
  const actionKey: AuthAction = supportedActions.includes(action as AuthAction)
    ? (action as AuthAction)
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

export function localizedSecurityCopy(
  action: string,
  language: string,
  context: {
    oldEmail?: string
    email?: string
    oldPhone?: string
    phone?: string
    provider?: string
    factorType?: string
  }
) {
  type SupportedLanguage = "tr" | "en" | "es" | "zh"
  type SecurityAction =
    | "password_changed_notification"
    | "email_changed_notification"
    | "phone_changed_notification"
    | "identity_linked_notification"
    | "identity_unlinked_notification"
    | "mfa_factor_enrolled_notification"
    | "mfa_factor_unenrolled_notification"
  const lang: SupportedLanguage = ["tr", "en", "es", "zh"].includes(language)
    ? (language as SupportedLanguage)
    : "en"
  const actionKey: SecurityAction = [
    "password_changed_notification",
    "email_changed_notification",
    "phone_changed_notification",
    "identity_linked_notification",
    "identity_unlinked_notification",
    "mfa_factor_enrolled_notification",
    "mfa_factor_unenrolled_notification",
  ].includes(action)
    ? (action as SecurityAction)
    : "password_changed_notification"
  const value = {
    oldEmail: context.oldEmail || "",
    email: context.email || "",
    oldPhone: context.oldPhone || "",
    phone: context.phone || "",
    provider: context.provider || "external",
    factorType: context.factorType || "MFA",
  }
  const common = {
    en: "If you did not make this change, secure your account and contact support immediately.",
    tr: "Bu değişikliği siz yapmadıysanız hesabınızı güvene alın ve hemen destek ekibiyle iletişime geçin.",
    es: "Si no realizaste este cambio, protege tu cuenta y contacta con soporte de inmediato.",
    zh: "如果这不是您的操作，请立即保护您的账户并联系支持团队。",
  } as const
  const copy = {
    en: {
      password_changed_notification: ["Your OnPace password was changed", "Password changed", "The password for your OnPace account was recently changed."],
      email_changed_notification: ["Your OnPace email was changed", "Email address changed", `Your account email changed from ${value.oldEmail} to ${value.email}.`],
      phone_changed_notification: ["Your OnPace phone number was changed", "Phone number changed", `Your account phone number changed from ${value.oldPhone} to ${value.phone}.`],
      identity_linked_notification: ["A sign-in method was linked", "Sign-in method linked", `${value.provider} was linked as a sign-in method for your account.`],
      identity_unlinked_notification: ["A sign-in method was removed", "Sign-in method removed", `${value.provider} was removed as a sign-in method for your account.`],
      mfa_factor_enrolled_notification: ["A verification method was added", "Verification method added", `${value.factorType} was added as a verification method for your account.`],
      mfa_factor_unenrolled_notification: ["A verification method was removed", "Verification method removed", `${value.factorType} was removed as a verification method from your account.`],
    },
    tr: {
      password_changed_notification: ["OnPace şifreniz değiştirildi", "Şifre değiştirildi", "OnPace hesabınızın şifresi kısa süre önce değiştirildi."],
      email_changed_notification: ["OnPace e-postanız değiştirildi", "E-posta adresi değiştirildi", `Hesap e-postanız ${value.oldEmail} adresinden ${value.email} adresine değiştirildi.`],
      phone_changed_notification: ["OnPace telefon numaranız değiştirildi", "Telefon numarası değiştirildi", `Hesap telefonunuz ${value.oldPhone} numarasından ${value.phone} numarasına değiştirildi.`],
      identity_linked_notification: ["Bir giriş yöntemi bağlandı", "Giriş yöntemi bağlandı", `${value.provider} hesabınıza giriş yöntemi olarak bağlandı.`],
      identity_unlinked_notification: ["Bir giriş yöntemi kaldırıldı", "Giriş yöntemi kaldırıldı", `${value.provider} hesabınızdan giriş yöntemi olarak kaldırıldı.`],
      mfa_factor_enrolled_notification: ["Bir doğrulama yöntemi eklendi", "Doğrulama yöntemi eklendi", `${value.factorType} hesabınıza doğrulama yöntemi olarak eklendi.`],
      mfa_factor_unenrolled_notification: ["Bir doğrulama yöntemi kaldırıldı", "Doğrulama yöntemi kaldırıldı", `${value.factorType} hesabınızdan doğrulama yöntemi olarak kaldırıldı.`],
    },
    es: {
      password_changed_notification: ["Tu contraseña de OnPace cambió", "Contraseña cambiada", "La contraseña de tu cuenta de OnPace se cambió recientemente."],
      email_changed_notification: ["Tu correo de OnPace cambió", "Correo electrónico cambiado", `El correo de tu cuenta cambió de ${value.oldEmail} a ${value.email}.`],
      phone_changed_notification: ["Tu teléfono de OnPace cambió", "Número de teléfono cambiado", `El teléfono de tu cuenta cambió de ${value.oldPhone} a ${value.phone}.`],
      identity_linked_notification: ["Se vinculó un método de acceso", "Método de acceso vinculado", `${value.provider} se vinculó como método de acceso a tu cuenta.`],
      identity_unlinked_notification: ["Se eliminó un método de acceso", "Método de acceso eliminado", `${value.provider} se eliminó como método de acceso de tu cuenta.`],
      mfa_factor_enrolled_notification: ["Se añadió un método de verificación", "Método de verificación añadido", `${value.factorType} se añadió como método de verificación a tu cuenta.`],
      mfa_factor_unenrolled_notification: ["Se eliminó un método de verificación", "Método de verificación eliminado", `${value.factorType} se eliminó como método de verificación de tu cuenta.`],
    },
    zh: {
      password_changed_notification: ["您的 OnPace 密码已更改", "密码已更改", "您的 OnPace 账户密码最近已更改。"],
      email_changed_notification: ["您的 OnPace 邮箱已更改", "邮箱地址已更改", `您的账户邮箱已从 ${value.oldEmail} 更改为 ${value.email}。`],
      phone_changed_notification: ["您的 OnPace 电话号码已更改", "电话号码已更改", `您的账户电话号码已从 ${value.oldPhone} 更改为 ${value.phone}。`],
      identity_linked_notification: ["已关联登录方式", "登录方式已关联", `${value.provider} 已作为登录方式关联到您的账户。`],
      identity_unlinked_notification: ["已移除登录方式", "登录方式已移除", `${value.provider} 已从您的账户登录方式中移除。`],
      mfa_factor_enrolled_notification: ["已添加验证方式", "验证方式已添加", `${value.factorType} 已作为验证方式添加到您的账户。`],
      mfa_factor_unenrolled_notification: ["已移除验证方式", "验证方式已移除", `${value.factorType} 已从您的账户验证方式中移除。`],
    },
  } as const
  const [subject, heading, message] = copy[lang][actionKey]
  const authChrome = localizedAuthCopy("magiclink", lang)
  return {
    subject,
    heading,
    message: `${message}\n\n${common[lang]}`,
    tagline: authChrome.tagline,
    footer: authChrome.footer,
  }
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
    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px">${formatEmailMessage(options.message)}</p>
    ${button}${token}
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">© ${escapeHtml(options.footer || "OnPace. All rights reserved.")}</p>
</div></body></html>`
}
