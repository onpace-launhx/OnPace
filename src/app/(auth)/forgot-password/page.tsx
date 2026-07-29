"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Mail, Loader2, AlertCircle } from "lucide-react";
import { getBrowserSiteOrigin } from "@/lib/site-url";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const callback = new URL("/auth/callback", getBrowserSiteOrigin());
    callback.searchParams.set(
      "next",
      "/set-password?mode=recovery&next=/dashboard"
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callback.toString(),
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setSuccessMsg("Reset password email sent! Check your inbox for instructions.");
      setLoading(false);
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
          Reset password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-hover transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleReset}>
            {errorMsg && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-red-700">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl bg-green-50 p-4 border border-green-100 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-green-700">{successMsg}</span>
              </div>
            )}

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
                  placeholder="you@school.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 active:scale-95 transition-all cursor-pointer items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending email...
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
