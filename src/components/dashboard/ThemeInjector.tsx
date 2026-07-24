"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function ThemeInjector() {
  const supabase = createClient();

  useEffect(() => {
    async function applyTheme() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("customization_settings")
        .eq("id", session.user.id)
        .single();

      if (!error && data?.customization_settings?.brand_color) {
        const color = data.customization_settings.brand_color;
        const root = document.documentElement;

        // Apply color properties
        root.style.setProperty("--color-brand", color);

        // Predefined variants for smooth hover/light background aesthetics
        const presets: Record<string, { hover: string; light: string; dark: string }> = {
          "#4F46E5": { hover: "#4338CA", light: "#EEF2FF", dark: "#312E81" }, // Indigo
          "#10B981": { hover: "#059669", light: "#ECFDF5", dark: "#064E3B" }, // Emerald
          "#0EA5E9": { hover: "#0284C7", light: "#F0F9FF", dark: "#0C4A6E" }, // Sky
          "#F43F5E": { hover: "#E11D48", light: "#FFF1F2", dark: "#4C0519" }, // Rose
          "#8B5CF6": { hover: "#7C3AED", light: "#F5F3FF", dark: "#2E1065" }, // Violet
          "#F59E0B": { hover: "#D97706", light: "#FEF3C7", dark: "#451A03" }, // Amber
        };

        const variant = presets[color] || { 
          hover: color, 
          light: color + "1a", // fallback to hex + alpha transparency
          dark: color 
        };

        root.style.setProperty("--color-brand-hover", variant.hover);
        root.style.setProperty("--color-brand-light", variant.light);
        root.style.setProperty("--color-brand-dark", variant.dark);
      }
    }

    applyTheme();

    // Listen to custom window event to change colors instantly in real-time
    const handleThemeChange = () => {
      applyTheme();
    };

    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  return null;
}
