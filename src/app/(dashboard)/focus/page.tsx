"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Lock,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  HelpCircle
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

export default function FocusPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Timer states
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"study" | "break">("study");
  const [ambientSound, setAmbientSound] = useState("none"); // "none", "rain", "white-noise", "forest"
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  // Premium modal popup & Custom alert dialog
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, [router, supabase]);

  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnds && trialEnds > now;
  const isPro = profile?.plan === "pro" || profile?.plan === "founding" || isTrialActive;

  // Countdown timer logic
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            setIsActive(false);
            setCustomAlert(
              mode === "study"
                ? (lang === "zh" ? "学习时间结束！休息一下吧。" : lang === "es" ? "¡Sesión de estudio completada! Toma un descanso." : "Study block complete! Take a break.")
                : (lang === "zh" ? "休息结束！准备好开始学习了吗？" : lang === "es" ? "¡Descanso completado! ¿Listo para estudiar?" : "Break complete! Ready to study?")
            );
            handleReset();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, mode, lang]);

  const handleReset = () => {
    setIsActive(false);
    setMinutes(mode === "study" ? 25 : 5);
    setSeconds(0);
  };

  const handleModeChange = (targetMode: "study" | "break") => {
    setMode(targetMode);
    setIsActive(false);
    setMinutes(targetMode === "study" ? 25 : 5);
    setSeconds(0);
  };

  const toggleSound = (soundType: string) => {
    if (!isPro) {
      setPremiumModalOpen(true);
      return;
    }
    if (ambientSound === soundType) {
      setAmbientSound("none");
      setIsPlayingSound(false);
    } else {
      setAmbientSound(soundType);
      setIsPlayingSound(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 min-h-screen bg-surface-dark text-white p-6 lg:p-10 flex flex-col justify-between items-center relative overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-gradient from-brand/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> {lang === "zh" ? "退出专注模式" : lang === "es" ? "Salir de Enfoque" : "Exit Focus Mode"}
        </button>
        
        {isPro ? (
          <div className="bg-brand/20 text-brand px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-brand/20">
            <Sparkles size={12} className="animate-pulse" /> {lang === "zh" ? "高级专注模式激活" : lang === "es" ? "Enfoque Pro Activo" : "Focus Active (Pro)"}
          </div>
        ) : (
          <button 
            onClick={() => setPremiumModalOpen(true)}
            className="bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer"
          >
            <Lock size={10} /> {lang === "zh" ? "升级激活 Pro 专注" : lang === "es" ? "Desbloquear Enfoque Pro" : "Unlock Pro Focus"}
          </button>
        )}
      </div>

      {/* Main Focus Center */}
      <div className="flex flex-col items-center justify-center space-y-12 my-auto z-10">
        
        {/* Study vs Break Switcher */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
          <button
            onClick={() => handleModeChange("study")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "study" ? "bg-white text-surface-dark shadow-sm" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.focus.timer.study}
          </button>
          <button
            onClick={() => handleModeChange("break")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "break" ? "bg-white text-surface-dark shadow-sm" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.focus.timer.break}
          </button>
        </div>

        {/* Ticking Visual Ring Timer */}
        <div className="relative h-64 w-64 sm:h-80 sm:w-80 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-8 border-white/5" />
          {/* Animated active focus border */}
          <div className={`absolute inset-0 rounded-full border-8 border-t-brand border-r-brand/50 border-b-white/5 border-l-white/5 transition-all duration-1000 ${
            isActive ? "animate-spin [animation-duration:8s]" : ""
          }`} />

          <div className="text-center space-y-2">
            <span className="text-6xl sm:text-7xl font-extrabold tracking-tight select-none">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
              {mode === "study" ? t.focus.timeToFocus : t.focus.takeABreak}
            </p>
          </div>
        </div>

        {/* Timer Control Toolbar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsActive(!isActive)}
            className="h-16 w-16 bg-white hover:bg-gray-100 text-surface-dark rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
          </button>
          <button
            onClick={handleReset}
            className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full active:scale-95 transition-all cursor-pointer text-gray-300 hover:text-white"
            title="Reset Session"
          >
            <RotateCcw size={18} />
          </button>
        </div>

      </div>

      {/* Ambient sound selectors toolbar */}
      <div className="w-full max-w-xl bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-2">
          {isPlayingSound ? <Volume2 className="text-brand animate-bounce" size={18} /> : <VolumeX className="text-gray-400" size={18} />}
          <span className="text-xs font-semibold text-gray-300">{t.focus.soundCabinet}</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { val: "rain", label: "☔ " + t.focus.sounds.rain },
            { val: "white-noise", label: "💤 " + t.focus.sounds.whiteNoise },
            { val: "forest", label: "🌲 " + t.focus.sounds.forest },
          ].map(sound => (
            <button
              key={sound.val}
              onClick={() => toggleSound(sound.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                ambientSound === sound.val
                  ? "bg-brand text-white border-brand shadow-sm"
                  : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:text-white"
              }`}
            >
              {!isPro && <Lock size={10} className="text-gray-400 shrink-0" />}
              {sound.label}
            </button>
          ))}
        </div>
      </div>

      {/* Premium Upgrade Modal Popup */}
      {premiumModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <Lock size={22} className="text-brand" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-surface-dark">
                {lang === "zh" ? "启用背景白噪音" : lang === "es" ? "Activar Sonido de Fondo" : "Unlock Background Sounds"}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {lang === "zh" ? "播放雨声、白噪音及森林自然环境音需要 Pro 会员。立即升级以建立沉浸式无干扰学习空间。" : lang === "es" ? "La reproducción de ruido blanco, tormenta y sonidos forestales requiere una suscripción Pro. Actualiza hoy para sumergirte en el estudio." : "Playing ambient rain, white noise, and forest soundscapes is a premium Pro feature. Upgrade now to build your ultimate distraction-free study zone."}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setPremiumModalOpen(false);
                  router.push("/billing");
                }}
                className="w-full py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                🚀 {lang === "zh" ? "升级至 Pro" : lang === "es" ? "Obtener Pro" : "Upgrade to Pro"}
              </button>
              <button
                onClick={() => setPremiumModalOpen(false)}
                className="w-full py-2.5 bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal Dialog */}
      {customAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-brand-light text-brand flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-dark">{lang === "zh" ? "专注提醒" : lang === "es" ? "Enfoque" : "Timer Finished"}</h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
            >
              {lang === "zh" ? "好的" : lang === "es" ? "Entendido" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
