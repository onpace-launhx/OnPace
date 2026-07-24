"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Palette, 
  Layout, 
  Grid, 
  Save, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";

const pageTranslations: Record<string, any> = {
  en: {
    title: "Dashboard Customization",
    subtitle: "Personalize your workspace look, toggle widgets, and adjust sizes to maximize your focus.",
    themeTitle: "Theme Primary Color",
    themeDesc: "Choose your workspace branding color accent. This overrides colors globally.",
    widgetsTitle: "Dashboard Layout Widgets",
    widgetsDesc: "Toggle visibility of specific dashboard blocks according to your daily study workflow.",
    sizesTitle: "Widget Layout Sizing",
    sizesDesc: "Configure grid sizes for active widgets to tailor your layout structure.",
    successMsg: "Customization preferences saved successfully!",
    saveBtn: "Save Preferences",
    backBtn: "Back to Dashboard",
    savingBtn: "Saving Preferences...",
    colorNames: {
      indigo: "Indigo (Default)",
      emerald: "Emerald Green",
      sky: "Sky Blue",
      rose: "Crimson Rose",
      violet: "Violet Purple",
      amber: "Amber Gold"
    },
    widgetNames: {
      streak: "Micro Goals & Streak Card",
      calendar: "Study Session Calendar",
      notes: "Recent Study Notes Notebooks",
      timer: "Fullscreen Focus Timer",
      ai: "AI Coach Study Plan Planner"
    },
    sizeOptions: {
      small: "Small (Col 1)",
      medium: "Medium (Col 2)",
      large: "Large (Full Row)"
    }
  },
  tr: {
    title: "Panel Özelleştirme",
    subtitle: "Çalışma alanınızın görünümünü kişiselleştirin, blokları açıp kapatın ve odaklanmanızı artırmak için boyutları ayarlayın.",
    themeTitle: "Tema Birincil Rengi",
    themeDesc: "Çalışma alanınızın marka renk tonunu seçin. Bu ayar genel renkleri geçersiz kılar.",
    widgetsTitle: "Gösterge Paneli Bileşenleri",
    widgetsDesc: "Günlük çalışma akışınıza göre belirli panellerin görünürlüğünü ayarlayın.",
    sizesTitle: "Bileşen Boyutlandırma",
    sizesDesc: "Aktif bileşenlerin ızgara (grid) boyutlarını kendinize göre yapılandırın.",
    successMsg: "Özelleştirme tercihleri başarıyla kaydedildi!",
    saveBtn: "Tercihleri Kaydet",
    backBtn: "Panele Geri Dön",
    savingBtn: "Tercihler Kaydediliyor...",
    colorNames: {
      indigo: "Çivit Mavisi (Varsayılan)",
      emerald: "Zümrüt Yeşili",
      sky: "Gök Mavisi",
      rose: "Gül Kırmızısı",
      violet: "Menekşe Moru",
      amber: "Kehribar Sarısı"
    },
    widgetNames: {
      streak: "Mikro Hedefler ve Seri Günlüğü",
      calendar: "Çalışma Oturumları Takvimi",
      notes: "Son Çalışma Defterleri ve Notları",
      timer: "Tam Ekran Odaklanma Sayacı",
      ai: "AI Koç Çalışma Planlayıcısı"
    },
    sizeOptions: {
      small: "Küçük (Tek Sütun)",
      medium: "Orta (Çift Sütun)",
      large: "Büyük (Tam Satır)"
    }
  },
  es: {
    title: "Personalización del Panel",
    subtitle: "Personaliza el aspecto de tu espacio de trabajo, activa widgets y ajusta tamaños para maximizar tu enfoque.",
    themeTitle: "Color Primario del Tema",
    themeDesc: "Elige el acento de color de tu espacio de trabajo. Esto anula los colores globalmente.",
    widgetsTitle: "Widgets del Tablero",
    widgetsDesc: "Activa o desactiva la visibilidad de bloques específicos del tablero según tu flujo de estudio.",
    sizesTitle: "Tamaño de Distribución de Widgets",
    sizesDesc: "Configura los tamaños de cuadrícula de los widgets activos para adaptar la estructura.",
    successMsg: "¡Preferencias de personalización guardadas con éxito!",
    saveBtn: "Guardar Preferencias",
    backBtn: "Volver al Tablero",
    savingBtn: "Guardando Preferencias...",
    colorNames: {
      indigo: "Índigo (Por defecto)",
      emerald: "Verde Esmeralda",
      sky: "Azul Celeste",
      rose: "Rosa Carmesí",
      violet: "Morado Violeta",
      amber: "Oro Ámbar"
    },
    widgetNames: {
      streak: "Racha y Metas Diarias",
      calendar: "Calendario de Sesiones de Estudio",
      notes: "Defterler y Notas Recientes",
      timer: "Temporizador de Enfoque Completo",
      ai: "Planificador AI Coach"
    },
    sizeOptions: {
      small: "Pequeño (1 Columna)",
      medium: "Mediano (2 Columnas)",
      large: "Grande (Fila Completa)"
    }
  },
  zh: {
    title: "工作台个性化配置",
    subtitle: "个性化您的备考工作台外观、调整各个功能块的显示隐藏和网格大小以专注备考。",
    themeTitle: "系统主题基色",
    themeDesc: "选择您专属的工作台配色主题方案。这将全局覆盖所有品牌色彩。",
    widgetsTitle: "工作台功能小部件",
    widgetsDesc: "根据您每日的学习备考习惯，自由勾选或隐藏特定的功能卡片。",
    sizesTitle: "网格卡片尺寸大小",
    sizesDesc: "配置每个活跃卡片所占用的网格列数，打造独一无二的视觉排版。",
    successMsg: "工作台偏好设置保存成功！",
    saveBtn: "保存工作台偏好",
    backBtn: "返回备考工作台",
    savingBtn: "正在保存设置...",
    colorNames: {
      indigo: "经典靛蓝 (默认)",
      emerald: "翡翠生机绿",
      sky: "晴空蔚蓝",
      rose: "蔷薇玫红",
      violet: "罗兰梦境紫",
      amber: "琥珀暖橙"
    },
    widgetNames: {
      streak: "打卡日历与微观目标",
      calendar: "学习计划日程表",
      notes: "最近复习笔记本",
      timer: "全屏高效专注计时器",
      ai: "AI 备考教练智能规划书"
    },
    sizeOptions: {
      small: "精致小巧 (单列)",
      medium: "标准中等 (双列)",
      large: "超大横幅 (整行)"
    }
  }
};

const colorPresets = [
  { hex: "#4F46E5", nameKey: "indigo", bg: "bg-indigo-500", text: "text-indigo-600" },
  { hex: "#10B981", nameKey: "emerald", bg: "bg-emerald-500", text: "text-emerald-600" },
  { hex: "#0EA5E9", nameKey: "sky", bg: "bg-sky-500", text: "text-sky-600" },
  { hex: "#F43F5E", nameKey: "rose", bg: "bg-rose-500", text: "text-rose-600" },
  { hex: "#8B5CF6", nameKey: "violet", bg: "bg-violet-500", text: "text-violet-600" },
  { hex: "#F59E0B", nameKey: "amber", bg: "bg-amber-500", text: "text-amber-600" },
];

export default function CustomizationPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Customization States
  const [brandColor, setBrandColor] = useState("#4F46E5");
  const [layout, setLayout] = useState<Record<string, boolean>>({
    streak: true,
    calendar: true,
    notes: true,
    timer: true,
    ai: true
  });
  const [widgetSizes, setWidgetSizes] = useState<Record<string, string>>({
    streak: "medium",
    calendar: "large",
    notes: "medium",
    timer: "medium",
    ai: "large"
  });

  const lang = profile?.language || "en";
  const t = pageTranslations[lang] || pageTranslations.en;

  useEffect(() => {
    async function loadPreferences() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        if (data.customization_settings) {
          const config = data.customization_settings;
          if (config.brand_color) setBrandColor(config.brand_color);
          if (config.layout) setLayout({ ...layout, ...config.layout });
          if (config.widget_sizes) setWidgetSizes({ ...widgetSizes, ...config.widget_sizes });
        }
      }
      setLoading(false);
    }
    loadPreferences();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSuccess(false);

    const payload = {
      brand_color: brandColor,
      layout,
      widget_sizes: widgetSizes
    };

    const { error } = await supabase
      .from("profiles")
      .update({
        customization_settings: payload
      })
      .eq("id", profile.id);

    if (!error) {
      setSuccess(true);
      // Dispatch custom window theme event so ThemeInjector updates instantly
      window.dispatchEvent(new Event("theme-change"));
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert("Failed to save customization settings: " + error.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <button 
            onClick={() => router.push("/dashboard")} 
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand cursor-pointer font-semibold transition-all mb-2 active:scale-95"
          >
            <ArrowLeft size={14} /> {t.backBtn}
          </button>
          <h1 className="text-2xl font-black text-surface-dark flex items-center gap-2">
            <Palette className="text-brand" /> {t.title}
          </h1>
          <p className="text-xs text-gray-400 max-w-xl">{t.subtitle}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-3 rounded-2xl bg-brand text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-brand-hover active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
          {saving ? t.savingBtn : t.saveBtn}
        </button>
      </div>

      {/* Main Settings Body Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Color Palette Selector Card */}
        <div className="md:col-span-1 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-surface-dark flex items-center gap-2">
            <Palette className="text-brand" size={16} /> {t.themeTitle}
          </h2>
          <p className="text-[11px] text-gray-400 leading-relaxed">{t.themeDesc}</p>
          
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            {colorPresets.map((preset) => (
              <button
                key={preset.hex}
                onClick={() => setBrandColor(preset.hex)}
                className={`p-3.5 border rounded-2xl cursor-pointer text-xs font-bold transition-all flex items-center gap-2 active:scale-95 ${
                  brandColor === preset.hex 
                    ? "border-brand ring-2 ring-brand/10 bg-brand/5 text-brand" 
                    : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ${preset.bg}`} />
                <span className="truncate">{t.colorNames[preset.nameKey]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Widgets Layout Toggle & Sizing Config Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Toggles */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-surface-dark flex items-center gap-2">
              <Layout className="text-brand" size={16} /> {t.widgetsTitle}
            </h2>
            <p className="text-[11px] text-gray-400">{t.widgetsDesc}</p>

            <div className="divide-y divide-gray-100 pt-2">
              {Object.keys(layout).map((key) => (
                <div key={key} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-surface-dark">{t.widgetNames[key]}</span>
                  </div>
                  <button
                    onClick={() => setLayout({ ...layout, [key]: !layout[key] })}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border ${
                      layout[key]
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {layout[key] ? (
                      <>
                        <Eye size={12} /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} /> Hidden
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-surface-dark flex items-center gap-2">
              <Grid className="text-brand" size={16} /> {t.sizesTitle}
            </h2>
            <p className="text-[11px] text-gray-400">{t.sizesDesc}</p>

            <div className="space-y-4 pt-2">
              {Object.keys(widgetSizes).map((key) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3 last:border-b-0 last:pb-0">
                  <span className={`text-xs font-bold ${layout[key] ? "text-surface-dark" : "text-gray-300"}`}>
                    {t.widgetNames[key]} {!layout[key] && "(Hidden)"}
                  </span>
                  
                  <select
                    disabled={!layout[key]}
                    value={widgetSizes[key]}
                    onChange={(e) => setWidgetSizes({ ...widgetSizes, [key]: e.target.value })}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs outline-none bg-white text-surface-dark font-semibold cursor-pointer disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <option value="small">{t.sizeOptions.small}</option>
                    <option value="medium">{t.sizeOptions.medium}</option>
                    <option value="large">{t.sizeOptions.large}</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Success notification banner */}
      {success && (
        <div className="fixed bottom-5 right-5 z-50 bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-green-600 animate-pulse" />
          <span className="text-xs font-bold">{t.successMsg}</span>
        </div>
      )}
    </div>
  );
}
