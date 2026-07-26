"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Language = "en" | "tr" | "es" | "zh";

const COPY = {
  en: {
    title: "Verify your email", requiredTitle: "Please verify your account",
    description: "Enter the 6-digit security code sent to your email.",
    requiredDescription: "Your account exists, but your email is not verified yet. Enter the code we sent to continue.",
    code: "Verification code", verify: "Verify and sign in", verifying: "Verifying...",
    resend: "Send a new code", resending: "Sending...", resent: "A new verification code has been sent.",
    invalid: "The code is invalid or has expired. Request a new code and try again.",
    successTitle: "Email verified", success: "Your account was verified successfully. You are now signed in.",
    redirecting: "Opening your dashboard...", back: "Back to sign in",
    missing: "The email address is missing. Return to sign in and try again.",
  },
  tr: {
    title: "E-postanızı doğrulayın", requiredTitle: "Lütfen hesabınızı doğrulayın",
    description: "E-postanıza gönderilen 6 haneli güvenlik kodunu girin.",
    requiredDescription: "Hesabınız mevcut ancak e-postanız henüz doğrulanmamış. Devam etmek için gönderdiğimiz kodu girin.",
    code: "Doğrulama kodu", verify: "Doğrula ve giriş yap", verifying: "Doğrulanıyor...",
    resend: "Yeni kod gönder", resending: "Gönderiliyor...", resent: "Yeni doğrulama kodu gönderildi.",
    invalid: "Kod geçersiz veya süresi dolmuş. Yeni kod isteyip tekrar deneyin.",
    successTitle: "E-posta doğrulandı", success: "Hesabınız başarıyla doğrulandı ve otomatik olarak giriş yapıldı.",
    redirecting: "Çalışma paneliniz açılıyor...", back: "Giriş ekranına dön",
    missing: "E-posta adresi bulunamadı. Giriş ekranına dönüp tekrar deneyin.",
  },
  es: {
    title: "Verifica tu correo", requiredTitle: "Verifica tu cuenta",
    description: "Introduce el código de seguridad de 6 dígitos enviado a tu correo.",
    requiredDescription: "Tu cuenta existe, pero el correo aún no está verificado. Introduce el código que enviamos para continuar.",
    code: "Código de verificación", verify: "Verificar e iniciar sesión", verifying: "Verificando...",
    resend: "Enviar un código nuevo", resending: "Enviando...", resent: "Se ha enviado un nuevo código de verificación.",
    invalid: "El código no es válido o ha caducado. Solicita uno nuevo e inténtalo de nuevo.",
    successTitle: "Correo verificado", success: "Tu cuenta se verificó correctamente y ya has iniciado sesión.",
    redirecting: "Abriendo tu panel...", back: "Volver al inicio de sesión",
    missing: "Falta la dirección de correo. Vuelve al inicio de sesión e inténtalo de nuevo.",
  },
  zh: {
    title: "验证您的邮箱", requiredTitle: "请验证您的账户",
    description: "请输入发送到您邮箱的 6 位安全验证码。",
    requiredDescription: "您的账户已创建，但邮箱尚未验证。请输入我们发送的验证码以继续。",
    code: "验证码", verify: "验证并登录", verifying: "正在验证...",
    resend: "发送新验证码", resending: "正在发送...", resent: "新的验证码已发送。",
    invalid: "验证码无效或已过期。请获取新验证码后重试。",
    successTitle: "邮箱已验证", success: "您的账户已成功验证并自动登录。",
    redirecting: "正在打开您的学习面板...", back: "返回登录",
    missing: "缺少邮箱地址。请返回登录页面后重试。",
  },
} as const;

function normalizeLanguage(value: string | null): Language {
  return value === "tr" || value === "es" || value === "zh" ? value : "en";
}

function buildEmailRedirect(origin: string, language: Language) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", `/verify-email?verified=1&mode=signup&lang=${language}`);
  return callback.toString();
}

function VerifyEmailContent() {
  const params = useSearchParams();
  const supabase = createClient();
  const language = normalizeLanguage(params.get("lang"));
  const t = COPY[language];
  const email = useMemo(() => (params.get("email") || "").trim().toLowerCase(), [params]);
  const linkedVerification = params.get("verified") === "1";
  const required = params.get("reason") === "required";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const isSuccess = linkedVerification || otpVerified;

  useEffect(() => {
    if (!isSuccess) return;
    const timer = window.setTimeout(() => window.location.assign("/dashboard"), 1800);
    return () => window.clearTimeout(timer);
  }, [isSuccess]);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);
    setError(null);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    if (verifyError || !data.session) {
      setError(t.invalid);
      setLoading(false);
      return;
    }
    setOtpVerified(true);
    setLoading(false);
  }

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError(null);
    setMessage(null);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: buildEmailRedirect(window.location.origin, language) },
    });
    if (resendError) setError(resendError.message);
    else setMessage(t.resent);
    setResending(false);
  }

  return (
    <main className="min-h-screen bg-surface-secondary px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
        <Link href="/" className="mb-7 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
            <ShieldCheck size={23} />
          </span>
          <span className="text-2xl font-extrabold text-surface-dark">OnPace</span>
        </Link>

        {isSuccess ? (
          <div className="py-5 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
            <h1 className="mt-5 text-2xl font-extrabold text-surface-dark">{t.successTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">{t.success}</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-brand">
              <Loader2 className="h-4 w-4 animate-spin" /> {t.redirecting}
            </div>
          </div>
        ) : (
          <>
            <MailCheck className="mx-auto h-14 w-14 text-brand" />
            <h1 className="mt-4 text-center text-2xl font-extrabold text-surface-dark">
              {required ? t.requiredTitle : t.title}
            </h1>
            <p className="mt-2 text-center text-sm leading-6 text-gray-600">
              {required ? t.requiredDescription : t.description}
            </p>
            {email && <p className="mt-2 text-center text-xs font-bold text-brand">{email}</p>}

            {!email ? (
              <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                {t.missing}
              </div>
            ) : (
              <form onSubmit={handleVerify} className="mt-7 space-y-4">
                <div>
                  <label htmlFor="verification-code" className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                    {t.code}
                  </label>
                  <input
                    id="verification-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-4 text-center text-2xl font-extrabold tracking-[0.45em] text-surface-dark outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    placeholder="000000"
                  />
                </div>
                {error && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</p>}
                {message && <p className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-600">{message}</p>}
                <button type="submit" disabled={loading || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? t.verifying : t.verify}
                </button>
                <button type="button" onClick={handleResend} disabled={resending} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
                  {resending ? t.resending : t.resend}
                </button>
              </form>
            )}
          </>
        )}

        {!isSuccess && <Link href="/login" className="mt-6 block text-center text-xs font-semibold text-gray-500 hover:text-brand">{t.back}</Link>}
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-surface-secondary flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
