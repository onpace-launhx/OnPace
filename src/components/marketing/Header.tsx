"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "@/lib/translations";

export function Header() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") || "en";
    setLang(saved);
  }, []);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem("language", newLang);
    // Dispatch global event so Hero, Features, Footer update instantly
    window.dispatchEvent(new Event("language-change"));
  };

  const t = getTranslations(lang);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="OnPace" width={32} height={32} className="rounded-lg object-contain" />
          <span className="text-xl font-bold tracking-tight text-surface-dark">OnPace</span>
        </Link>
        <nav className="hidden md:flex gap-6">
          <a href="#features" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">
            {t.marketing?.navFeatures || "Features"}
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">
            {t.marketing?.navHowItWorks || "How it works"}
          </a>
          <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">
            {t.marketing?.navPricing || "Pricing"}
          </a>
        </nav>
        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
          >
            <option value="en">🇬🇧 English</option>
            <option value="tr">🇹🇷 Türkçe</option>
            <option value="zh">🇨🇳 中文</option>
            <option value="es">🇪🇸 Español</option>
          </select>

          <Link href="/login" className="hidden text-sm font-medium text-gray-600 hover:text-brand transition-colors sm:block">
            {t.marketing?.navSignIn || "Sign in"}
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-hover active:scale-95 transition-all"
          >
            {t.marketing?.navGetStarted || "Get Started"}
          </Link>
        </div>
      </div>
    </header>
  );
}
