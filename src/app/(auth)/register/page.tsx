"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setRememberSessionIntent } from "@/lib/auth/remember-session";
import { CheckCircle2, Lock, Mail, User, GraduationCap, Loader2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
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

    const callback = new URL("/auth/callback", window.location.origin);
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
          language,
          promocode: promoVerified ? promoCode.trim() : null,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
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
        redirectTo: window.location.origin + "/auth/callback?next=/dashboard&new_user=true",
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      setErrorMsg(error.message);
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
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-hover transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-2xl sm:px-10">
          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-3 mb-6">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-red-700">{errorMsg}</span>
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
            {googleLoading ? "Redirecting..." : "Sign up with Google"}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500 font-medium">or register with email</span>
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
                Full name
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
                  placeholder="Alex Smith"
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
                Grade / Goal level
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
                  <option value="" disabled>Select your grade/study path</option>
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
                Account and email language
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
                Verification and security emails will use this language.
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
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
                Password
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
                Do you have a Promo Code?
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
                  placeholder="e.g. TRIAL30"
                />
                <button
                  type="button"
                  onClick={handleVerifyPromo}
                  disabled={verifyingPromo || !promoCode.trim() || promoVerified}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[70px]"
                >
                  {verifyingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify"}
                </button>
              </div>
              {promoError && (
                <p className="text-[10px] text-red-500 font-semibold">{promoError}</p>
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  "Create free account"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
