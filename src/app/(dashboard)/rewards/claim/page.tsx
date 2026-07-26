"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Gift, Loader2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Language = "en" | "tr" | "es" | "zh";

const COPY = {
  en: {
    loading: "Activating your reward...",
    title: "Reward activated",
    description: (days: number, plan: string) =>
      `${days} extra day(s) of ${plan.toUpperCase()} access were added to your account.`,
    errorTitle: "Reward could not be activated",
    back: "Go to dashboard",
  },
  tr: {
    loading: "Ödülünüz etkinleştiriliyor...",
    title: "Ödül etkinleştirildi",
    description: (days: number, plan: string) =>
      `Hesabınıza ${plan.toUpperCase()} paketinde ${days} ek gün tanımlandı.`,
    errorTitle: "Ödül etkinleştirilemedi",
    back: "Çalışma paneline git",
  },
  es: {
    loading: "Activando tu recompensa...",
    title: "Recompensa activada",
    description: (days: number, plan: string) =>
      `Se añadieron ${days} día(s) adicionales de acceso ${plan.toUpperCase()} a tu cuenta.`,
    errorTitle: "No se pudo activar la recompensa",
    back: "Ir al panel",
  },
  zh: {
    loading: "正在激活您的奖励...",
    title: "奖励已激活",
    description: (days: number, plan: string) =>
      `您的账户已增加 ${days} 天 ${plan.toUpperCase()} 套餐使用时间。`,
    errorTitle: "无法激活奖励",
    back: "前往学习面板",
  },
} as const;

function ClaimContent() {
  const params = useSearchParams();
  const [language, setLanguage] = useState<Language>("en");
  const [result, setResult] = useState<{
    reward_days: number;
    reward_plan: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = params.get("token") || "";
  const t = COPY[language];

  useEffect(() => {
    let active = true;
    async function claim() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const preferred =
        user?.user_metadata?.language || localStorage.getItem("language") || "en";
      if (active && ["en", "tr", "es", "zh"].includes(preferred)) {
        setLanguage(preferred as Language);
      }
      if (!token) {
        if (active) setError("Invalid reward link");
        return;
      }
      const response = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok || !data.reward) setError(data.error || "Reward failed");
      else setResult(data.reward);
    }
    void claim();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5 py-10">
      <section className="w-full rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        {!result && !error && (
          <>
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-brand" />
            <h1 className="mt-5 text-xl font-extrabold text-surface-dark">
              {t.loading}
            </h1>
          </>
        )}
        {result && (
          <>
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <Gift size={38} />
            </span>
            <CheckCircle2 className="mx-auto mt-4 h-7 w-7 text-emerald-500" />
            <h1 className="mt-3 text-2xl font-extrabold text-surface-dark">
              {t.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {t.description(result.reward_days, result.reward_plan)}
            </p>
          </>
        )}
        {error && (
          <>
            <TriangleAlert className="mx-auto h-16 w-16 text-amber-500" />
            <h1 className="mt-4 text-2xl font-extrabold text-surface-dark">
              {t.errorTitle}
            </h1>
            <p className="mt-3 break-words text-sm text-gray-600">{error}</p>
          </>
        )}
        {(result || error) && (
          <a
            href="/dashboard"
            className="mt-7 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover"
          >
            {t.back}
          </a>
        )}
      </section>
    </main>
  );
}

export default function ClaimRewardPage() {
  return (
    <Suspense fallback={<Loader2 className="m-auto h-7 w-7 animate-spin text-brand" />}>
      <ClaimContent />
    </Suspense>
  );
}
