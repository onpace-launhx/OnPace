"use client";

"use client";

import React from "react";
import { Wrench, Shield, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";

type MaintenanceLocaleContent = {
  badge?: string;
  title?: string;
  description?: string;
  coming_title?: string;
  coming_items?: string[];
  back_soon?: string;
};

export function MaintenanceScreen({
  userLanguage = "en",
  content,
}: {
  userLanguage?: string;
  content?: Record<string, MaintenanceLocaleContent> | null;
}) {
  const supabase = createClient();
  const t = getTranslations(userLanguage);
  const language = ["en", "tr", "es", "zh"].includes(userLanguage)
    ? userLanguage
    : "en";
  const copy = {
    en: {
      badge: "Scheduled upgrade in progress",
      coming: "What is coming in this update:",
      ai: "Enhanced AI study assistant and visual analysis",
      calendar: "Real-time notifications and calendar improvements",
      admin: "Administrator sign in",
    },
    tr: {
      badge: "Planlı güncelleme devam ediyor",
      coming: "Bu güncellemeyle birlikte:",
      ai: "Geliştirilmiş yapay zekâ çalışma asistanı ve görsel analiz",
      calendar: "Gerçek zamanlı bildirimler ve takvim iyileştirmeleri",
      admin: "Yönetici girişi",
    },
    es: {
      badge: "Actualización programada en curso",
      coming: "Novedades de esta actualización:",
      ai: "Asistente de estudio con IA y análisis visual mejorados",
      calendar: "Notificaciones en tiempo real y mejoras del calendario",
      admin: "Acceso de administrador",
    },
    zh: {
      badge: "计划更新正在进行",
      coming: "本次更新内容：",
      ai: "增强的 AI 学习助手与图像分析",
      calendar: "实时通知与日历改进",
      admin: "管理员登录",
    },
  }[language as "en" | "tr" | "es" | "zh"];
  const customCopy = content?.[language];
  const comingItems = Array.isArray(customCopy?.coming_items)
    ? customCopy.coming_items.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : customCopy
      ? []
      : [copy.ai, copy.calendar];
  const localized = {
    badge: customCopy?.badge ?? copy.badge,
    title: customCopy?.title || t.maintenance?.title || "Sistem Bakımdadır",
    description:
      customCopy?.description ||
      t.maintenance?.desc ||
      "Platformumuzu yeni özelliklerle güncellemek için şu anda planlı bakım yapıyoruz.",
    comingTitle: customCopy?.coming_title ?? copy.coming,
    backSoon:
      customCopy?.back_soon ??
      t.maintenance?.backSoon ??
      "Yakında tekrar yayında olacağız!",
  };

  const handleAdminSignIn = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login?next=/admin";
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-6 text-surface-dark relative overflow-hidden">
      {/* Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-light/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-150 shadow-2xl text-center space-y-6 relative z-10 backdrop-blur-md">
        {/* Icon & Badge */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand to-brand-dark flex items-center justify-center text-white shadow-xl shadow-brand/25 transform -rotate-3 transition-transform hover:rotate-0">
            <Wrench size={36} className="animate-bounce" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        {/* Text Details */}
        <div className="space-y-3">
          {localized.badge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
              <Clock size={13} />
              <span>{localized.badge}</span>
            </div>
          )}

          <h1 className="text-2xl font-extrabold text-surface-dark tracking-tight">
            {localized.title}
          </h1>

          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
            {localized.description}
          </p>
        </div>

        {/* Feature Cards Preview */}
        {comingItems.length > 0 && (
          <div className="p-4 bg-surface-secondary rounded-2xl border border-gray-100 text-left space-y-2 text-xs">
            {localized.comingTitle && (
              <p className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                {localized.comingTitle}
              </p>
            )}
            <ul className="space-y-1.5 text-gray-500 text-[11px]">
              {comingItems.map((item, index) => (
                <li key={`${item}-${index}`} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand mt-1.5 shrink-0"></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sub-notice */}
        {localized.backSoon && (
          <p className="text-xs font-bold text-brand">{localized.backSoon}</p>
        )}

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mx-auto inline-flex items-center gap-1.5 rounded-xl border border-brand/15 bg-brand/5 px-3 py-2 text-[11px] font-bold text-brand hover:bg-brand/10 transition-colors"
        >
          <RefreshCw size={12} />
          {language === "tr" ? "Tekrar kontrol et" : language === "es" ? "Comprobar de nuevo" : language === "zh" ? "重新检查" : "Check again"}
        </button>

        {/* Admin Direct Bypass Login Link */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-center">
          <button
            type="button"
            onClick={handleAdminSignIn}
            className="text-[11px] text-gray-400 hover:text-brand font-semibold transition-colors flex items-center gap-1"
          >
            <Shield size={12} /> {copy.admin} <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
