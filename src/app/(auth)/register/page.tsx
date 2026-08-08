"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setRememberSessionIntent } from "@/lib/auth/remember-session";
import { getBrowserSiteOrigin } from "@/lib/site-url";
import { CheckCircle2, Lock, Mail, User, GraduationCap, Loader2, AlertCircle, MapPin } from "lucide-react";
import { countryOptions, getCountryName } from "@/lib/countries";

const registrationErrors = {
  en: {
    password: "Choose a stronger password that meets the password requirements.",
    registered: "An account already exists for this email. Sign in or reset your password.",
    fallback: "We could not create your account. Please review your details and try again.",
  },
  tr: {
    password: "Parola gereksinimlerini karşılayan daha güçlü bir parola seçin.",
    registered: "Bu e-posta için zaten bir hesap var. Giriş yapın veya parolanızı sıfırlayın.",
    fallback: "Hesabınız oluşturulamadı. Bilgilerinizi kontrol edip tekrar deneyin.",
  },
  es: {
    password: "Elige una contraseña más segura que cumpla los requisitos.",
    registered: "Ya existe una cuenta con este correo. Inicia sesión o restablece la contraseña.",
    fallback: "No pudimos crear tu cuenta. Revisa tus datos e inténtalo de nuevo.",
  },
  zh: {
    password: "请选择符合密码要求的更安全密码。",
    registered: "此邮箱已有账户。请登录或重置密码。",
    fallback: "无法创建账户，请检查填写的信息后重试。",
  },
};

function friendlyRegistrationError(message: string, language: string) {
  const copy = registrationErrors[language as keyof typeof registrationErrors] || registrationErrors.en;
  const normalized = message.toLowerCase();
  if (normalized.includes("password")) return copy.password;
  if (normalized.includes("already registered") || normalized.includes("already exists")) return copy.registered;
  return copy.fallback;
}

const registerCopy = {
  en: {
    title: "Create your account", already: "Already have an account?", signIn: "Sign in",
    google: "Sign up with Google", redirecting: "Redirecting...", divider: "or register with email",
    fullName: "Full name", namePlaceholder: "Alex Smith", grade: "Grade / Goal level",
    chooseGrade: "Select your grade/study path", language: "Account and email language",
    languageHelp: "Verification and security emails will use this language.", country: "Country",
    chooseCountry: "Select your country", countryHelp: "We use this only to suggest relevant exams and study paths.",
    email: "Email address", password: "Password", promo: "Do you have a Promo Code?",
    promoPlaceholder: "e.g. TRIAL30", promoVerify: "Verify", creating: "Creating account...", create: "Create free account",
  },
  tr: {
    title: "Hesabını oluştur", already: "Zaten hesabın var mı?", signIn: "Giriş yap",
    google: "Google ile kayıt ol", redirecting: "Yönlendiriliyor...", divider: "veya e-posta ile kayıt ol",
    fullName: "Ad soyad", namePlaceholder: "Ata Yılmaz", grade: "Sınıf / Hedef düzeyi",
    chooseGrade: "Sınıfını veya çalışma yolunu seç", language: "Hesap ve e-posta dili",
    languageHelp: "Doğrulama ve güvenlik e-postaları bu dili kullanır.", country: "Ülke",
    chooseCountry: "Ülkeni seç", countryHelp: "Bunu yalnızca ilgili sınavları ve çalışma yollarını önermek için kullanırız.",
    email: "E-posta adresi", password: "Parola", promo: "Promosyon kodun var mı?",
    promoPlaceholder: "Örn. TRIAL30", promoVerify: "Doğrula", creating: "Hesap oluşturuluyor...", create: "Ücretsiz hesap oluştur",
  },
  es: {
    title: "Crea tu cuenta", already: "¿Ya tienes una cuenta?", signIn: "Inicia sesión",
    google: "Registrarse con Google", redirecting: "Redirigiendo...", divider: "o regístrate con correo",
    fullName: "Nombre completo", namePlaceholder: "Alex García", grade: "Curso / Objetivo",
    chooseGrade: "Selecciona tu curso o ruta de estudio", language: "Idioma de la cuenta y los correos",
    languageHelp: "Los correos de verificación y seguridad usarán este idioma.", country: "País",
    chooseCountry: "Selecciona tu país", countryHelp: "Lo usamos solo para sugerir exámenes y rutas de estudio relevantes.",
    email: "Correo electrónico", password: "Contraseña", promo: "¿Tienes un código promocional?",
    promoPlaceholder: "p. ej. TRIAL30", promoVerify: "Verificar", creating: "Creando cuenta...", create: "Crear cuenta gratuita",
  },
  zh: {
    title: "创建您的账户", already: "已有账户？", signIn: "登录",
    google: "使用 Google 注册", redirecting: "正在跳转...", divider: "或使用邮箱注册",
    fullName: "姓名", namePlaceholder: "王小明", grade: "年级 / 目标",
    chooseGrade: "选择年级或学习路径", language: "账户和邮件语言",
    languageHelp: "验证和安全邮件将使用此语言。", country: "国家/地区",
    chooseCountry: "选择国家/地区", countryHelp: "仅用于推荐相关考试和学习路径。",
    email: "邮箱地址", password: "密码", promo: "有优惠码吗？",
    promoPlaceholder: "例如 TRIAL30", promoVerify: "验证", creating: "正在创建账户...", create: "创建免费账户",
  },
};

function subscribeToHydration() {
  return () => {};
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Promocode States
  const [promoCode, setPromoCode] = useState("");
  const [promoVerified, setPromoVerified] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string | null>(null);
  const [verifyingPromo, setVerifyingPromo] = useState(false);
  const countryNamesReady = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const t = registerCopy[language as keyof typeof registerCopy] || registerCopy.en;

  // Locale display names can differ between server and browser runtimes; the
  // server snapshot uses country codes, then translated names appear after hydration.

  const handleVerifyPromo = async () => {
    if (!promoCode.trim()) return;
    setVerifyingPromo(true);
    setPromoError(null);
    setPromoSuccessMsg(null);

    try {
      const res = await fetch("/api/promocode/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, isSignup: true })
      });
      const data = await res.json();
      if (data.error) {
        setPromoError(data.error);
        setPromoVerified(false);
      } else if (data.valid) {
        setPromoSuccessMsg(`Promo Code Applied: ${data.description}!`);
        setPromoVerified(true);
      }
    } catch {
      setPromoError("Network error checking promo code.");
    }
    setVerifyingPromo(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const callback = new URL("/auth/callback", getBrowserSiteOrigin());
    callback.searchParams.set(
      "next",
      `/verify-email?verified=1&mode=signup&lang=${language}`
    );
    localStorage.setItem("language", language);
    setRememberSessionIntent(true);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callback.toString(),
        data: {
          full_name: fullName,
          grade_level: gradeLevel,
          country,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          language,
          promocode: promoVerified ? promoCode.trim() : null,
        },
      },
    });

    if (error) {
      setErrorMsg(friendlyRegistrationError(error.message, language));
      setLoading(false);
    } else {
      // Check if user is auto-confirmed or needs email confirmation
      if (data.session) {
        router.push("/dashboard");
      } else {
        const query = new URLSearchParams({
          email: email.trim().toLowerCase(),
          mode: "signup",
          lang: language,
        });
        router.push(`/verify-email?${query.toString()}`);
      }
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    setRememberSessionIntent(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getBrowserSiteOrigin()}/auth/callback?next=/dashboard&new_user=true`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      setErrorMsg(friendlyRegistrationError(error.message, language));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-surface-secondary">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-surface-dark">OnPace</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-surface-dark">
          {t.title}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t.already}{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-hover transition-colors">
            {t.signIn}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-2xl sm:px-10">
          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-3 mb-6">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span className="content-break-anywhere min-w-0 text-sm font-medium text-red-700">{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-Up Button */}
          <button
            type="button"
            id="google-signup-btn"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {googleLoading ? t.redirecting : t.google}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500 font-medium">{t.divider}</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleRegister}>
            {successMsg && (
              <div className="rounded-xl bg-green-50 p-4 border border-green-100 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-green-700">{successMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                {t.fullName}
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm bg-white text-surface-dark placeholder-gray-400 transition-all outline-none"
                  placeholder={t.namePlaceholder}
                />
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-gray-500">
              {language === "tr"
                ? "Hesap oluşturarak "
                : language === "es"
                  ? "Al crear una cuenta, aceptas la "
                  : language === "zh"
                    ? "创建账户即表示您同意"
                    : "By creating an account, you agree to the "}
              <Link href={`/terms?lang=${language}`} target="_blank" className="font-bold text-brand hover:underline">
                {language === "tr" ? "Kullanım Şartları’nı" : language === "es" ? "Términos de Servicio" : language === "zh" ? "服务条款" : "Terms of Service"}
              </Link>
              {language === "zh" ? "和" : language === "tr" ? " ve " : language === "es" ? " y la " : " and acknowledge the "}
              <Link href={`/privacy?lang=${language}`} target="_blank" className="font-bold text-brand hover:underline">
                {language === "tr" ? "Gizlilik Politikası’nı" : language === "es" ? "Política de Privacidad" : language === "zh" ? "隐私政策" : "Privacy Policy"}
              </Link>
              {language === "tr" ? " kabul etmiş olursunuz." : language === "es" ? "." : language === "zh" ? "。" : "."}
            </p>

            <div>
              <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">
                {t.grade}
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="gradeLevel"
                  name="gradeLevel"
                  required
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm bg-white text-surface-dark transition-all outline-none cursor-pointer"
                >
                  <option value="" disabled>{t.chooseGrade}</option>
                  <option value="Grade 9">Grade 9 (Freshman)</option>
                  <option value="Grade 10">Grade 10 (Sophomore)</option>
                  <option value="Grade 11">Grade 11 (Junior)</option>
                  <option value="Grade 12">Grade 12 (Senior)</option>
                  <option value="AP Prep">AP Exams Prep</option>
                  <option value="SAT/ACT Prep">SAT / ACT Prep</option>
                  <option value="IB Programme">IB Programme</option>
                  <option value="GCSE/A-Levels">GCSE / A-Levels</option>
                  <option value="Other">Other Finals / Regular</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                {t.language}
              </label>
              <select
                id="language"
                name="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="mt-1 block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm bg-white text-surface-dark transition-all outline-none"
              >
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
                <option value="es">Español</option>
                <option value="zh">中文</option>
              </select>
              <p className="mt-1.5 text-xs text-gray-500">
                {t.languageHelp}
              </p>
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                {t.country}
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="country"
                  name="country"
                  required
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm bg-white text-surface-dark transition-all outline-none cursor-pointer"
                >
                  <option value="" disabled>{t.chooseCountry}</option>
                      {countryOptions.map((countryCode) => (
                        <option key={countryCode} value={countryCode}>
                          {countryNamesReady
                            ? getCountryName(countryCode, language)
                            : countryCode}
                        </option>
                      ))}
                </select>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {t.countryHelp}
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t.email}
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm bg-white text-surface-dark placeholder-gray-400 transition-all outline-none"
                  placeholder="alex@school.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t.password}
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm bg-white text-surface-dark placeholder-gray-400 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Do you have a Promocode? Section */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <label htmlFor="promoCode" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t.promo}
              </label>
              <div className="flex gap-2">
                <input
                  id="promoCode"
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoVerified(false);
                    setPromoError(null);
                    setPromoSuccessMsg(null);
                  }}
                  disabled={promoVerified}
                  className="block flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand text-xs bg-white text-surface-dark placeholder-gray-400 transition-all outline-none"
                  placeholder={t.promoPlaceholder}
                />
                <button
                  type="button"
                  onClick={handleVerifyPromo}
                  disabled={verifyingPromo || !promoCode.trim() || promoVerified}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[70px]"
                >
                  {verifyingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.promoVerify}
                </button>
              </div>
              {promoError && (
                <p className="content-break-anywhere text-[10px] text-red-500 font-semibold">{promoError}</p>
              )}
              {promoSuccessMsg && (
                <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                  <CheckCircle2 size={10} /> {promoSuccessMsg}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 active:scale-95 transition-all cursor-pointer items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t.creating}
                  </>
                ) : (
                  t.create
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
