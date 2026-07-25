"use client";

import React from "react";
import { Wrench, Shield, Clock, ArrowRight } from "lucide-react";
import { getTranslations } from "@/lib/translations";

export function MaintenanceScreen({ userLanguage = "en" }: { userLanguage?: string }) {
  const t = getTranslations(userLanguage);

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60">
            <Clock size={13} />
            <span>Scheduled Upgrade in Progress</span>
          </div>

          <h1 className="text-2xl font-extrabold text-surface-dark tracking-tight">
            {t.maintenance?.title || "Sistem Bakımdadır"}
          </h1>

          <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
            {t.maintenance?.desc ||
              "Platformumuzu yeni özelliklerle güncellemek için şu anda planlı bakım yapıyoruz. Lütfen kısa süre sonra tekrar kontrol edin!"}
          </p>
        </div>

        {/* Feature Cards Preview */}
        <div className="p-4 bg-surface-secondary rounded-2xl border border-gray-100 text-left space-y-2 text-xs">
          <p className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">
            What's coming in this update:
          </p>
          <ul className="space-y-1.5 text-gray-500 text-[11px]">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
              Enhanced AI Study Assistant & Vision OCR
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
              Real-time Notifications & Calendar Enhancements
            </li>
          </ul>
        </div>

        {/* Sub-notice */}
        <p className="text-xs font-bold text-brand">
          {t.maintenance?.backSoon || "Yakında tekrar yayında olacağız!"}
        </p>

        {/* Admin Direct Bypass Login Link */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-center">
          <a
            href="/admin"
            className="text-[11px] text-gray-400 hover:text-brand font-semibold transition-colors flex items-center gap-1"
          >
            <Shield size={12} /> Administrator Sign In <ArrowRight size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}
