"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Send,
  Loader2,
  BrainCircuit,
  MessageSquare,
  BookOpen,
  HelpCircle,
  Clock,
  Lock
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

export default function AiAssistantPage() {
  const router = useRouter();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");

  // Premium modal popup & Custom alerts
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  const [activeSessionId, setActiveSessionId] = useState<string>("");

  useEffect(() => {
    async function loadProfileAndChat() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(profileData);

      // Load courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id);
      if (coursesData) setCourses(coursesData);

      // Sync active chat session & messages
      try {
        const { data: sessions } = await supabase
          .from("ai_chat_sessions")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        let sessId = "";
        if (sessions && sessions.length > 0) {
          sessId = sessions[0].id;
        } else {
          const { data: newSess } = await supabase
            .from("ai_chat_sessions")
            .insert([{ user_id: user.id, title: "Study Assistant Chat" }])
            .select("id")
            .single();
          if (newSess) sessId = newSess.id;
        }

        if (sessId) {
          setActiveSessionId(sessId);
          const { data: dbMsgs } = await supabase
            .from("ai_chat_messages")
            .select("role, content")
            .eq("session_id", sessId)
            .order("created_at", { ascending: true });

          if (dbMsgs && dbMsgs.length > 0) {
            setMessages(
              dbMsgs.map((m: { role: string; content: string }, idx: number) => ({
                id: idx.toString(),
                sender: m.role === "user" ? "user" : "ai",
                text: m.content,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }

      setLoading(false);
    }
    loadProfileAndChat();
  }, [router, supabase]);

  // Set localized welcome message once translation loader completes
  useEffect(() => {
    if (!loading && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: t.ai.welcomeMsg || "Hey! I'm your OnPace AI Study Coach. Select a course context or ask me anything. Let's build a smart study structure today!"
        }
      ]);
    }
  }, [loading, t, messages.length]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnds && trialEnds > now;
  const isPro = profile?.plan === "pro" || profile?.plan === "founding" || isTrialActive;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || sending) return;

    const userText = inputMsg.trim();
    const contextPrefix = selectedCourse ? `[Context: ${selectedCourse}] ` : "";
    const fullMessageText = `${contextPrefix}${userText}`;

    // Add user message to UI
    const userMessage = { id: Date.now().toString(), sender: "user", text: fullMessageText };
    setMessages((prev) => [...prev, userMessage]);
    setInputMsg("");
    setSending(true);

    try {
      if (activeSessionId) {
        await supabase.from("ai_chat_messages").insert([
          { session_id: activeSessionId, role: "user", content: fullMessageText }
        ]);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: fullMessageText,
          history: messages.map((m) => ({
            sender: m.sender,
            text: m.text
          }))
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          setCustomAlert(t.ai.limitError || data.error);
          setPremiumModalOpen(true);
        }
        throw new Error(data.error || "AI assistant is unavailable.");
      }
      const reply = data.reply || data.text;
      if (!reply) {
        throw new Error("AI returned an empty response.");
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "ai", text: reply }
      ]);

      if (activeSessionId) {
        await supabase.from("ai_chat_messages").insert([
          { session_id: activeSessionId, role: "assistant", content: reply }
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: `⚠️ ${error instanceof Error ? error.message : t.common.errorOccurred}`,
        }
      ]);
    }
    setSending(false);
  };

  const selectSuggestion = (text: string) => {
    setInputMsg(text);
  };

  const handleContextChange = (courseVal: string) => {
    if (!isPro && courseVal !== "") {
      setPremiumModalOpen(true);
      return;
    }
    setSelectedCourse(courseVal);
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

  // Suggestion queries translated loosely or general fallbacks
  const suggestionQueries = lang === "zh"
    ? [
        "用 3 个要点解释光合作用",
        "给我一个 AP 化学的三步学习计划",
        "帮我拆分一篇 10 页的历史论文任务",
        "为 SAT 数学创建 3 道练习题"
      ]
    : lang === "es"
    ? [
        "Explica la fotosíntesis en 3 puntos clave",
        "Dame un plan de estudio de 3 pasos para Química AP",
        "Ayúdame a desglosar un ensayo extenso de historia",
        "Crea 3 preguntas de práctica para matemáticas del SAT"
      ]
    : [
        "Explain photosynthesis in 3 bullet points",
        "Give me a 3-step study plan for AP Chemistry",
        "Help me break down a massive 10-page history paper",
        "Create 3 practice questions for SAT math"
      ];

  return (
    <main className="flex-1 p-6 lg:p-10 flex flex-col h-[calc(100vh-2rem)] overflow-hidden max-w-5xl mx-auto w-full justify-between">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
            <BrainCircuit className="text-brand" /> {t.ai.title}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{t.ai.subtitle}</p>
        </div>

        {/* Course Context Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400">{t.ai.context}:</span>
          <select
            value={selectedCourse}
            onChange={(e) => handleContextChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium bg-white text-surface-dark outline-none cursor-pointer"
          >
            <option value="">{t.ai.general}</option>
            {courses.map(course => (
              <option key={course.id} value={course.name}>
                {!isPro ? "🔒 " : ""}{course.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggestion Badges */}
      {messages.length <= 1 && (
        <div className="my-auto py-6 shrink-0 text-center space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {lang === "zh" ? "建议问题" : lang === "es" ? "Consultas Sugeridas" : "Suggested Queries"}
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
            {suggestionQueries.map((text, idx) => (
              <button
                key={idx}
                onClick={() => selectSuggestion(text)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:border-brand text-xs text-gray-600 hover:text-brand font-medium transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto border border-gray-150 rounded-3xl bg-white p-6 my-6 space-y-4 shadow-sm min-h-[300px]">
        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${
                isAi ? "" : "ml-auto flex-row-reverse"
              }`}
            >
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                isAi ? "bg-brand/10 text-brand" : "bg-gray-100 text-gray-600"
              }`}>
                {isAi ? <Sparkles size={14} /> : "ME"}
              </div>
              <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                isAi ? "bg-brand-light/30 text-surface-dark rounded-tl-sm" : "bg-brand text-white rounded-tr-sm"
              }`}>
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand shrink-0">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="p-4 bg-brand-light/30 text-gray-400 rounded-3xl rounded-tl-sm text-sm flex items-center gap-1.5 font-medium">
              {lang === "zh" ? "学习教练正在思考..." : lang === "es" ? "El asesor de estudio está pensando..." : "Study Coach is thinking..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSend} className="flex gap-2 shrink-0 bg-white p-2 border border-gray-150 rounded-3xl shadow-sm">
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          placeholder={selectedCourse ? `Ask study coach about ${selectedCourse}...` : (t.ai.placeholderChat || "Ask study coach...")}
          className="flex-1 px-4 py-3 bg-transparent text-sm outline-none text-surface-dark placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={!inputMsg.trim() || sending}
          className="p-3 bg-brand text-white rounded-2xl hover:bg-brand-hover active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Premium Upgrade Modal Popup */}
      {premiumModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <Lock size={22} className="text-brand" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-surface-dark">
                {lang === "zh" ? "获得无限 AI 学习辅助" : lang === "es" ? "Obtener AI de Estudio Ilimitado" : "Get Unlimited AI Study Coach"}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {lang === "zh" ? "免费版每天仅限 5 条 AI 提问，且无法绑定课程上下文。升级至 Pro 即可畅享无限 AI 对话及个性化备考助手。" : lang === "es" ? "El plan gratuito limita las consultas a 5 por día y bloquea los contextos de curso. Actualiza a Pro para disfrutar de tutorías de IA ilimitadas." : "Free tier accounts are limited to 5 AI messages daily and cannot bind specific course contexts. Upgrade to Pro for unlimited AI coach dialogs and personalized exam assistance."}
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
              <HelpCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-dark">{lang === "zh" ? "额度提示" : lang === "es" ? "Límite Excedido" : "Limit Notified"}</h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
            >
              {lang === "zh" ? "知道了" : lang === "es" ? "Entendido" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
