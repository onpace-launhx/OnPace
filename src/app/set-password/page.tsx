"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Lock, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

export default function SetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"setup" | "recovery">("setup");
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode =
      params.get("mode") === "recovery" ? "recovery" : "setup";

    void supabase.auth.getSession().then(({ data, error }) => {
      setMode(requestedMode);
      if (error || !data.session?.user) {
        setErrorMsg(
          "This password link is invalid or has expired. Request a new password reset email."
        );
        return;
      }
      setSessionReady(true);
    });
  }, [supabase]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!sessionReady) {
      setErrorMsg(
        "This password link is invalid or has expired. Request a new password reset email."
      );
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setSuccessMsg("Password set successfully! Taking you to your dashboard…");
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const destination =
        requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : "/dashboard";
      setTimeout(() => window.location.replace(destination), 700);
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

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
            <ShieldCheck className="h-7 w-7 text-brand" />
          </div>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-surface-dark">
            {mode === "recovery" ? "Choose a new password" : "Welcome to OnPace!"}
          </h2>
          <p className="mt-1 text-center text-sm text-gray-500 max-w-xs leading-relaxed">
            {mode === "recovery"
              ? "Enter your new password. After it is saved, your account will open automatically."
              : "Set a password for your account so you can also log in with email in the future."}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-2xl sm:px-10">
          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-3 mb-6">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-red-700">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-green-50 p-4 border border-green-100 flex items-start gap-3 mb-6">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-green-700">{successMsg}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSetPassword}>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm bg-white text-surface-dark placeholder-gray-400 transition-all outline-none"
                  placeholder="At least 8 characters"
                  minLength={8}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm bg-white text-surface-dark placeholder-gray-400 transition-all outline-none"
                  placeholder="Repeat your password"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading || !sessionReady}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 active:scale-95 transition-all cursor-pointer items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Setting password…
                  </>
                ) : (
                  mode === "recovery"
                    ? "Save new password & continue"
                    : "Set password & continue"
                )}
              </button>
            </div>
          </form>

          {mode !== "recovery" && (
            <div className="mt-4 text-center">
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium"
              >
                Skip for now →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
