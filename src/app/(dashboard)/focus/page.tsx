"use client";

import { useEffect, useState, useRef } from "react";
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
  X,
  AlertTriangle,
  Maximize2
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

export default function FocusPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Timer states
  const [studyLength, setStudyLength] = useState(25);
  const [breakLength, setBreakLength] = useState(5);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"study" | "break">("study");
  const [ambientSound, setAmbientSound] = useState("none"); // "none", "rain", "white-noise", "forest"
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  // Focus history & analytics states
  const [focusHistory, setFocusHistory] = useState<any[]>([]);
  const [tabDistractionCount, setTabDistractionCount] = useState(0);

  // Immersive exit prevention & analytics tracking states
  const [showExitModal, setShowExitModal] = useState(false);
  const [totalSessionSeconds, setTotalSessionSeconds] = useState(25 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [timerRestored, setTimerRestored] = useState(false);

  // Browser-native ambient audio. No external MP3 host is required.
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const allowFullscreenExitRef = useRef(false);

  // Premium modal popup & Custom alert dialog
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);
  const isStudyLockActive = isActive && mode === "study";

  const releaseFullscreenLock = async () => {
    if (!document.fullscreenElement) return;
    allowFullscreenExitRef.current = true;
    try {
      await document.exitFullscreen();
    } catch {
      // Browsers may reject the request if fullscreen has already ended.
    } finally {
      window.setTimeout(() => {
        allowFullscreenExitRef.current = false;
      }, 0);
    }
  };

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

      // Keep an in-progress timer alive when the user navigates away and returns.
      // The saved timestamp lets the timer continue accurately even while this page is unmounted.
      const savedTimer = window.localStorage.getItem(`onpace-focus-timer:${user.id}`);
      if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          const savedRemaining = Number(parsed.remainingSeconds);
          const elapsedSinceSave = parsed.isActive
            ? Math.max(0, Math.floor((Date.now() - Number(parsed.savedAt || Date.now())) / 1000))
            : 0;
          const remaining = Math.max(0, savedRemaining - elapsedSinceSave);
          const total = parsed.mode === "break" ? Number(parsed.breakLength) * 60 : Number(parsed.studyLength) * 60;

          if (Number.isFinite(remaining) && remaining >= 0) {
            setStudyLength(Number(parsed.studyLength) || 25);
            setBreakLength(Number(parsed.breakLength) || 5);
            setMode(parsed.mode === "break" ? "break" : "study");
            setMinutes(Math.floor(remaining / 60));
            setSeconds(remaining % 60);
            setElapsedSeconds(Math.max(0, (Number(parsed.elapsedSeconds) || 0) + (savedRemaining - remaining)));
            setTotalSessionSeconds(total || 25 * 60);
            setIsActive(Boolean(parsed.isActive) && remaining > 0);
          }
        } catch {
          window.localStorage.removeItem(`onpace-focus-timer:${user.id}`);
        }
      }
      setTimerRestored(true);

      // Load user's focus history for analytics
      const { data: history } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (history) {
        setFocusHistory(history);
      }

      setLoading(false);
    }
    loadProfile();
  }, [router, supabase]);

  useEffect(() => {
    if (!profile?.id || !timerRestored) return;
    const remainingSeconds = Math.max(0, minutes * 60 + seconds);
    window.localStorage.setItem(`onpace-focus-timer:${profile.id}`, JSON.stringify({
      studyLength,
      breakLength,
      mode,
      remainingSeconds,
      elapsedSeconds,
      isActive,
      savedAt: Date.now(),
    }));
  }, [profile?.id, timerRestored, studyLength, breakLength, mode, minutes, seconds, elapsedSeconds, isActive]);

  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnds && trialEnds > now;
  const isPro = profile?.plan === "pro" || profile?.plan === "founding" || isTrialActive;

  // Tab Switch / Visibility Distraction Detector
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isStudyLockActive) {
        setTabDistractionCount(prev => prev + 1);
        setCustomAlert(
          lang === "tr"
            ? "⚠️ Odaklanma modundayken sekme değiştirdiniz! Dikkat dağıtıcı siteler engelleniyor."
            : "⚠️ You switched tabs during an active Focus Session! Stay on pace."
        );
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isStudyLockActive, lang]);

  // 1. Alert user if they attempt to close the tab during active focus mode
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isStudyLockActive) {
        e.preventDefault();
        e.returnValue = "Focus session in progress! Are you sure you want to exit?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isStudyLockActive]);

  // 2. Immersive Fullscreen Detection & Exit Prevention
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (
        !allowFullscreenExitRef.current &&
        !document.fullscreenElement &&
        isStudyLockActive
      ) {
        setShowExitModal(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isStudyLockActive]);

  // Save focus session analytic record to database
  const saveFocusSession = async (completed: boolean) => {
    if (elapsedSeconds < 2) return;
    setIsSavingSession(true);
    
    try {
      const { data } = await supabase.from("focus_sessions").insert([
        {
          user_id: profile.id,
          duration_seconds: elapsedSeconds,
          mode: mode,
          completed: completed
        }
      ]).select("*").single();

      if (data) {
        setFocusHistory(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error("Failed to save focus session metrics:", err);
    } finally {
      setIsSavingSession(false);
    }
  };

  // 3. Countdown Timer loop with analytics tracking
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);

        if (seconds === 0) {
          if (minutes === 0) {
            setIsActive(false);
            void releaseFullscreenLock();
            saveFocusSession(true);
            
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
  }, [isActive, minutes, seconds, mode, lang, elapsedSeconds]);

  // Ambient sound player. Synthesized audio avoids broken third-party sound URLs.
  useEffect(() => {
    const stopSound = () => {
      try { noiseSourceRef.current?.stop(); } catch {}
      noiseSourceRef.current?.disconnect();
      noiseSourceRef.current = null;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };

    stopSound();
    if (!isPlayingSound || ambientSound === "none") return stopSound;

    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      setCustomAlert(lang === "tr" ? "Tarayıcınız ortam seslerini desteklemiyor." : "Your browser does not support ambient audio.");
      return stopSound;
    }

    const context = new AudioContextConstructor();
    const source = context.createBufferSource();
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;

    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    if (ambientSound === "rain") {
      filter.type = "highpass";
      filter.frequency.value = 700;
      gain.gain.value = 0.075;
    } else if (ambientSound === "forest") {
      filter.type = "lowpass";
      filter.frequency.value = 650;
      gain.gain.value = 0.06;
    } else {
      filter.type = "allpass";
      gain.gain.value = 0.045;
    }

    source.buffer = buffer;
    source.loop = true;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
    void context.resume();
    audioContextRef.current = context;
    noiseSourceRef.current = source;

    return stopSound;
  }, [isPlayingSound, ambientSound, lang]);

  const handleStartSession = async () => {
    setIsActive(true);
    if (mode !== "study") {
      await releaseFullscreenLock();
      return;
    }

    // Request Fullscreen
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn("Fullscreen request blocked by browser:", err);
      }
    }
  };

  const handlePauseSession = () => {
    setIsActive(false);
    if (mode === "study") {
      void releaseFullscreenLock();
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setMinutes(mode === "study" ? studyLength : breakLength);
    setSeconds(0);
    setElapsedSeconds(0);
    void releaseFullscreenLock();
  };

  const handleModeChange = (targetMode: "study" | "break") => {
    setMode(targetMode);
    setIsActive(false);
    setTabDistractionCount(0);
    const targetLength = targetMode === "study" ? studyLength : breakLength;
    setMinutes(targetLength);
    setSeconds(0);
    setTotalSessionSeconds(targetLength * 60);
    setElapsedSeconds(0);
    if (targetMode === "break") {
      setShowExitModal(false);
      void releaseFullscreenLock();
    }
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

  // Exit Focus flow: stops sessions, records progress in DB, and exits fullscreen
  const handleExitFocus = async () => {
    setIsActive(false);
    setShowExitModal(false);
    
    // Save progress as incomplete
    await saveFocusSession(false);
    
    await releaseFullscreenLock();
    router.push("/dashboard");
  };

  const handleResumeFocus = async () => {
    setShowExitModal(false);
    setIsActive(true);
    if (mode === "study" && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {}
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B0F19]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <p className="text-sm font-semibold text-gray-400">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  // Calculate Ring Progress circle
  const currentTotal = mode === "study" ? studyLength * 60 : breakLength * 60;
  const currentRemaining = minutes * 60 + seconds;
  const percentage = ((currentTotal - currentRemaining) / currentTotal) * 100;
  const strokeDashoffset = 282.6 - (282.6 * percentage) / 100;

  return (
    <main className="flex-1 min-h-screen bg-[#070A13] text-white p-6 lg:p-10 flex flex-col justify-between items-center relative overflow-hidden font-sans">
      
      {/* Immersive background particles & radial blur */}
      <div className="absolute inset-0 bg-radial-gradient from-brand/15 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header bar */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <button
          onClick={() => {
            if (isStudyLockActive) {
              setShowExitModal(true);
            } else {
              router.push("/dashboard");
            }
          }}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md"
        >
          <ArrowLeft size={14} /> {lang === "zh" ? "退出专注模式" : lang === "es" ? "Salir de Enfoque" : "Exit Focus Mode"}
        </button>
        
        {isPro ? (
          <div className="bg-brand/10 text-brand px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-brand/20 backdrop-blur-md">
            <Sparkles size={12} className="animate-pulse" /> {lang === "zh" ? "高级专注模式激活" : lang === "es" ? "Enfoque Pro Activo" : "Focus Active (Pro)"}
          </div>
        ) : (
          <button 
            onClick={() => setPremiumModalOpen(true)}
            className="bg-white/5 hover:bg-white/10 text-gray-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer backdrop-blur-md"
          >
            <Lock size={10} /> {lang === "zh" ? "升级激活 Pro 专注" : lang === "es" ? "Desbloquear Enfoque Pro" : "Unlock Pro Focus"}
          </button>
        )}
      </div>

      {/* Main Focus Center */}
      <div className="flex flex-col items-center justify-center space-y-12 my-auto z-10 w-full max-w-lg">
        
        {/* Study vs Break Switcher */}
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-md shadow-inner">
          <button
            onClick={() => handleModeChange("study")}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "study" ? "bg-white text-[#070A13] shadow-md font-extrabold" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.focus.timer.study}
          </button>
          <button
            onClick={() => handleModeChange("break")}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === "break" ? "bg-white text-[#070A13] shadow-md font-extrabold" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.focus.timer.break}
          </button>
        </div>

        {/* Custom Timer Length Adjuster (Item 13) */}
        {!isActive && (
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-xs text-gray-300 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-400">📚 Study:</span>
              <button 
                onClick={() => {
                  const val = Math.max(5, studyLength - 5);
                  setStudyLength(val);
                  if (mode === "study") setMinutes(val);
                }}
                className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95"
              >
                -
              </button>
              <span className="text-white font-bold w-7 text-center">{studyLength}m</span>
              <button 
                onClick={() => {
                  const val = Math.min(120, studyLength + 5);
                  setStudyLength(val);
                  if (mode === "study") setMinutes(val);
                }}
                className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95"
              >
                +
              </button>
            </div>
            <div className="h-4 w-px bg-white/15" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-400">☕ Break:</span>
              <button 
                onClick={() => {
                  const val = Math.max(1, breakLength - 1);
                  setBreakLength(val);
                  if (mode === "break") setMinutes(val);
                }}
                className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95"
              >
                -
              </button>
              <span className="text-white font-bold w-7 text-center">{breakLength}m</span>
              <button 
                onClick={() => {
                  const val = Math.min(30, breakLength + 1);
                  setBreakLength(val);
                  if (mode === "break") setMinutes(val);
                }}
                className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer transition-all active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Tab Switch Distraction Warning Indicator */}
        {mode === "study" && tabDistractionCount > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
            <AlertTriangle size={12} /> Tab Switched {tabDistractionCount} time{tabDistractionCount > 1 ? "s" : ""} during session
          </div>
        )}

        {/* Ticking Visual Ring Timer */}
        <div className="relative h-72 w-72 sm:h-80 sm:w-80 flex items-center justify-center bg-white/[0.02] rounded-full border border-white/5 shadow-2xl backdrop-blur-sm">
          
          {/* SVG Progress Circle */}
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-white/5 fill-transparent"
              strokeWidth="6"
            />
            <circle
              cx="50%"
              cy="50%"
              r="44%"
              className="stroke-brand fill-transparent transition-all duration-1000"
              strokeWidth="6"
              strokeDasharray="282.6"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Sparkles rotating on active */}
          {isActive && (
            <div className="absolute inset-0 rounded-full border border-brand/20 animate-spin [animation-duration:12s]" />
          )}

          <div className="text-center space-y-3 z-15">
            <span className="text-6xl sm:text-7.5xl font-extrabold tracking-tighter select-none font-sans block text-white drop-shadow-[0_0_15px_rgba(2,116,223,0.3)]">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold bg-white/5 px-3 py-1 rounded-full border border-white/5 inline-block">
              {mode === "study" ? t.focus.timeToFocus : t.focus.takeABreak}
            </p>
          </div>
        </div>

        {/* Timer Control Toolbar */}
        <div className="flex items-center gap-5">
          <button
            onClick={isActive ? handlePauseSession : handleStartSession}
            className={`h-20 w-20 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center border ${
              isActive 
                ? "bg-transparent border-white/20 text-white hover:bg-white/5" 
                : "bg-white border-white text-[#070A13] hover:bg-gray-100"
            }`}
            title={isActive ? "Pause" : "Start Fullscreen Focus"}
          >
            {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
          </button>
          
          <button
            onClick={handleReset}
            className="p-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full active:scale-95 transition-all cursor-pointer text-gray-300 hover:text-white"
            title="Reset Timer"
          >
            <RotateCcw size={20} />
          </button>
        </div>

      </div>

      {/* Ambient sound selectors toolbar */}
      <div className="w-full max-w-xl bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 z-10 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-2">
          {isPlayingSound ? <Volume2 className="text-brand animate-bounce" size={18} /> : <VolumeX className="text-gray-400" size={18} />}
          <span className="text-xs font-bold text-gray-300">{t.focus.soundCabinet}</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { val: "rain", label: "☔ " + t.focus.sounds.rain },
            { val: "white-noise", label: "🌊 " + t.focus.sounds.whiteNoise },
            { val: "forest", label: "🌲 " + t.focus.sounds.forest },
          ].map(sound => (
            <button
              key={sound.val}
              onClick={() => toggleSound(sound.val)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                ambientSound === sound.val
                  ? "bg-brand text-white border-brand shadow-sm font-bold"
                  : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20 hover:text-white"
              }`}
            >
              {!isPro && <Lock size={10} className="text-gray-400 shrink-0" />}
              {sound.label}
            </button>
          ))}
        </div>
      </div>

      {/* Focus Analytics & History Card */}
      <div className="w-full max-w-xl bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4 z-10 backdrop-blur-md mt-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
            <Timer className="text-brand" size={16} /> 
            {lang === "tr" ? "Focus Analytics & Odaklanma Geçmişi" : "Focus Analytics & History"}
          </h4>
          <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            {focusHistory.length} Sessions Logged
          </span>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Today</span>
            <span className="text-base font-extrabold text-brand mt-0.5 block">
              {Math.round(
                focusHistory
                  .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
                  .reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0) / 60
              )} mins
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Total Focus</span>
            <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
              {Math.round(focusHistory.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0) / 60)} mins
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Completion</span>
            <span className="text-base font-extrabold text-purple-400 mt-0.5 block">
              {focusHistory.length > 0
                ? Math.round((focusHistory.filter(s => s.completed).length / focusHistory.length) * 100)
                : 100}%
            </span>
          </div>
        </div>

        {/* Weekly Bar Chart Visualization */}
        <div className="pt-2">
          <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Weekly Focus Trend</span>
          <div className="flex items-end justify-between h-20 gap-2 px-2 border-b border-white/10 pb-2">
            {[6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
              const d = new Date();
              d.setDate(d.getDate() - daysAgo);
              const dayStr = d.toDateString();
              const dayLabel = d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", { weekday: "narrow" });
              
              const daySeconds = focusHistory
                .filter(s => new Date(s.created_at).toDateString() === dayStr)
                .reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
              const dayMins = Math.round(daySeconds / 60);
              const barHeightPercent = Math.min(100, Math.max(10, (dayMins / 60) * 100));

              return (
                <div key={daysAgo} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {dayMins > 0 && (
                    <div className="absolute -top-7 bg-white text-surface-dark text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none whitespace-nowrap">
                      {dayMins}m
                    </div>
                  )}
                  <div
                    className="w-full bg-brand/80 hover:bg-brand rounded-t-md transition-all"
                    style={{ height: `${dayMins === 0 ? 4 : barHeightPercent}%` }}
                  />
                  <span className="text-[9px] font-bold text-gray-500">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Immersive Exit Warning Modal Dialog */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-[#070A13]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D1222] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative shadow-2xl text-center">
            <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto border border-yellow-500/20">
              <AlertTriangle size={28} className="animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-white">Exit Focus Mode?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your deep study block is currently active! Leaving now will log your focused time ({Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s) and mark this session as incomplete.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleExitFocus}
                disabled={isSavingSession}
                className="flex-1 py-3 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 rounded-2xl active:scale-95 transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSavingSession ? <Loader2 className="h-3 w-3 animate-spin" /> : <X size={14} />}
                End & Quit
              </button>
              <button
                onClick={handleResumeFocus}
                className="flex-1 py-3 bg-brand text-white font-extrabold rounded-2xl hover:bg-brand-hover active:scale-95 transition-all text-xs cursor-pointer shadow-md shadow-brand/20 flex items-center justify-center gap-1.5"
              >
                <Maximize2 size={14} />
                Keep Studying
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Upgrade Modal Popup */}
      {premiumModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 relative border border-gray-150 shadow-2xl text-center text-surface-dark">
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
        <div className="fixed inset-0 z-50 bg-[#070A13]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D1222] rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 relative border border-white/10 shadow-2xl text-center">
            <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto border border-brand/20">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{lang === "zh" ? "专注提醒" : lang === "es" ? "Enfoque" : "Timer Finished"}</h4>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-3 bg-brand text-white text-xs font-bold rounded-2xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer shadow-md shadow-brand/10"
            >
              {lang === "zh" ? "好的" : lang === "es" ? "Entendido" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
