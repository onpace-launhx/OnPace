"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Lock, Mail, User, GraduationCap, Loader2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          grade_level: gradeLevel,
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
        setSuccessMsg("Registration successful! Please check your email to verify your account.");
        setLoading(false);
      }
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
          <form className="space-y-6" onSubmit={handleRegister}>
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

            <div>
              <button
                type="submit"
                disabled={loading}
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
