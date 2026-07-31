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
  Lock,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { PersonalizedLearningStudio } from "@/components/dashboard/PersonalizedLearningStudio";
import { StudyVisual } from "@/components/ai/StudyVisual";
import type { StudyVisualSpec } from "@/lib/study-visual";

export default function AiAssistantPage() {
  const router = useRouter();
  const supabase = createClient();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [studyVisual, setStudyVisual] = useState<StudyVisualSpec | null>(null);
  const [generatingVisual, setGeneratingVisual] = useState(false);

  // Premium modal popup & Custom alerts
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<"chat" | "personalized">("chat");

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "personalized") setWorkspaceMode("personalized");
  }, []);

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
          .select("id, title, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        let sessId = "";
        if (sessions && sessions.length > 0) {
          sessId = sessions[0].id;
          setChatSessions(sessions);
        } else {
          const { data: newSess } = await supabase
            .from("ai_chat_sessions")
            .insert([{ user_id: user.id, title: "Study Assistant Chat" }])
            .select("id, title, created_at, updated_at")
            .single();
          if (newSess) {
            sessId = newSess.id;
            setChatSessions([newSess]);
          }
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

  const openChatSession = async (session: any) => {
    if (!session?.id || session.id === activeSessionId) return;
    const { data: dbMsgs, error } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    if (error) {
      setCustomAlert(error.message);
      return;
    }
    setActiveSessionId(session.id);
    setShowChatHistory(false);
    setMessages(
      (dbMsgs || []).map((message: { id: string; role: string; content: string }) => ({
        id: message.id,
        sender: message.role === "user" ? "user" : "ai",
        text: message.content,
      }))
    );
  };

  const createChatSession = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data, error } = await supabase
      .from("ai_chat_sessions")
      .insert([{ user_id: userData.user.id, title: "New study chat" }])
      .select("id, title, created_at, updated_at")
      .single();
    if (error || !data) {
      setCustomAlert(error?.message || "Unable to create a new chat.");
      return;
    }
    setChatSessions((current) => [data, ...current]);
    setActiveSessionId(data.id);
    setMessages([]);
    setInputMsg("");
    setSelectedCourse("");
    setShowChatHistory(false);
  };

  const deleteChatSession = async (session: any) => {
    const confirmed = window.confirm(
      lang === "tr" ? "Bu AI sohbetini silmek istediğinize emin misiniz?" : "Delete this AI conversation?"
    );
    if (!confirmed) return;
    const { error } = await supabase.from("ai_chat_sessions").delete().eq("id", session.id);
    if (error) {
      setCustomAlert(error.message);
      return;
    }
    const remaining = chatSessions.filter((item) => item.id !== session.id);
    setChatSessions(remaining);
    if (session.id === activeSessionId) {
      if (remaining[0]) {
        await openChatSession(remaining[0]);
      } else {
        await createChatSession();
      }
    }
  };

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

  // Keep scrolling scoped to the message panel. scrollIntoView here would also
  // move the dashboard's parent scroller and hide the page header.
  useEffect(() => {
    const panel = chatScrollRef.current;
    if (panel) panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const switchWorkspaceMode = (mode: "chat" | "personalized") => {
    setWorkspaceMode(mode);
    const url = new URL(window.location.href);
    if (mode === "personalized") url.searchParams.set("mode", "personalized");
    else url.searchParams.delete("mode");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

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
        if (!messages.some((message) => message.sender === "user")) {
          const sessionTitle = userText.length > 42 ? `${userText.slice(0, 42)}…` : userText;
          await supabase
            .from("ai_chat_sessions")
            .update({ title: sessionTitle, updated_at: new Date().toISOString() })
            .eq("id", activeSessionId);
          setChatSessions((current) => current.map((session) =>
            session.id === activeSessionId ? { ...session, title: sessionTitle } : session
          ));
        }
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
      <div className="flex h-full min-h-[60vh] w-full items-center justify-center bg-surface-secondary">
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

  const workspaceLabels = {
    title: lang === "tr" ? "AI Öğrenme Alanı" : lang === "zh" ? "AI 学习空间" : lang === "es" ? "Espacio de aprendizaje con IA" : "AI Learning Studio",
    subtitle: lang === "tr" ? "Serbestçe sohbet et veya materyallerini kendi öğrenme araçlarınla çalış." : lang === "zh" ? "自由对话，或使用你的个性化学习工具处理学习材料。" : lang === "es" ? "Conversa libremente o trabaja tus materiales con tus herramientas personalizadas." : "Chat freely or study your materials with personalized learning tools.",
    chat: lang === "tr" ? "AI Sohbet" : lang === "zh" ? "AI 对话" : lang === "es" ? "Chat con IA" : "AI Chat",
    personalized: lang === "tr" ? "Kişiselleştirilmiş Çalışma" : lang === "zh" ? "个性化学习" : lang === "es" ? "Estudio personalizado" : "Personalized Study",
  };

  const handleGenerateStudyVisual = async () => {
    if (generatingVisual) return;
    const latestUserMessage = [...messages].reverse().find((message) => message.sender === "user")?.text || "";
    const source = inputMsg.trim() || latestUserMessage;
    if (!source) {
      setCustomAlert(lang === "tr" ? "Önce görselleştirilecek bir konu yazın." : "Enter a topic to visualize first.");
      return;
    }
    setGeneratingVisual(true);
    try {
      const response = await fetch("/api/study-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, title: selectedCourse, language: lang }),
      });
      const data = await response.json();
      if (!response.ok || !data.visual) throw new Error(data.error || "Study visual could not be created.");
      setStudyVisual(data.visual);
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : "Study visual could not be created.");
    } finally {
      setGeneratingVisual(false);
    }
  };

  const chatLabels = {
    newChat: lang === "tr" ? "Yeni sohbet" : lang === "zh" ? "新对话" : lang === "es" ? "Nuevo chat" : "New chat",
    history: lang === "tr" ? "Sohbet geçmişi" : lang === "zh" ? "对话历史" : lang === "es" ? "Historial de chats" : "Chat history",
    suggestions: lang === "tr" ? "Önerilen başlangıçlar" : lang === "zh" ? "建议问题" : lang === "es" ? "Consultas sugeridas" : "Suggested queries",
    noHistory: lang === "tr" ? "Henüz kayıtlı sohbet yok." : lang === "zh" ? "还没有保存的对话。" : lang === "es" ? "Aún no hay conversaciones guardadas." : "No saved conversations yet.",
    delete: lang === "tr" ? "Sohbeti sil" : lang === "zh" ? "删除对话" : lang === "es" ? "Eliminar conversación" : "Delete conversation",
  };

  return (
    <main className="mx-auto flex h-[calc(100%_-_4rem)] min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:h-full lg:p-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
            <BrainCircuit className="text-brand" /> {workspaceLabels.title}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{workspaceLabels.subtitle}</p>
        </div>

        {/* Course Context Selector */}
        {workspaceMode === "chat" && <div className="flex items-center gap-2">
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
        </div>}
      </div>

      <div className="mt-4 flex shrink-0 items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => switchWorkspaceMode("chat")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            workspaceMode === "chat" ? "bg-brand text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-brand"
          }`}
        >
          <MessageSquare size={15} /> {workspaceLabels.chat}
        </button>
        <button
          type="button"
          onClick={() => switchWorkspaceMode("personalized")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            workspaceMode === "personalized" ? "bg-brand text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-brand"
          }`}
        >
          <Sparkles size={15} /> {workspaceLabels.personalized}
        </button>
      </div>

      {workspaceMode === "chat" ? <>
      <div className="mt-4 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={createChatSession}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-hover transition-colors"
        >
          <Plus size={14} /> {chatLabels.newChat}
        </button>
        <button
          type="button"
          onClick={() => setShowChatHistory(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 hover:border-brand/40 hover:text-brand transition-colors"
        >
          <Clock size={14} /> {chatLabels.history}
          {chatSessions.length > 0 && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{chatSessions.length}</span>}
        </button>
      </div>

      {/* Chat Messages Body */}
      <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain border border-gray-150 rounded-3xl bg-white p-4 sm:p-6 my-4 space-y-4 shadow-sm">
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
        {studyVisual && (
          <div className="mx-auto w-full max-w-3xl py-2">
            <StudyVisual visual={studyVisual} />
          </div>
        )}
        {messages.length <= 1 && !sending && (
          <div className="mx-auto max-w-2xl pt-2 pb-6 text-center space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{chatLabels.suggestions}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestionQueries.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSuggestion(text)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-brand hover:text-brand active:scale-95"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}
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
        <div />
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
          type="button"
          onClick={handleGenerateStudyVisual}
          disabled={generatingVisual || (!inputMsg.trim() && !messages.some((message) => message.sender === "user"))}
          className="flex items-center gap-1.5 rounded-2xl border border-brand/20 bg-brand/5 px-3 text-xs font-bold text-brand transition-all hover:bg-brand/10 disabled:opacity-40"
          title="Generate a structured visual study aid"
        >
          {generatingVisual ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          <span className="hidden sm:inline">{lang === "tr" ? "Görsel çalışma" : lang === "es" ? "Visual de estudio" : lang === "zh" ? "学习可视化" : "Study visual"}</span>
        </button>
        <button
          type="submit"
          disabled={!inputMsg.trim() || sending}
          className="p-3 bg-brand text-white rounded-2xl hover:bg-brand-hover active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
      </> : (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pr-1">
          <PersonalizedLearningStudio embedded />
        </div>
      )}

      {showChatHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close chat history"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
            onClick={() => setShowChatHistory(false)}
          />
          <aside className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl sm:w-[23rem]" aria-label={chatLabels.history}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
              <div>
                <p className="text-sm font-extrabold text-surface-dark">{chatLabels.history}</p>
                <p className="mt-0.5 text-xs text-gray-400">{chatSessions.length} {lang === "tr" ? "sohbet" : "conversations"}</p>
              </div>
              <button type="button" onClick={() => setShowChatHistory(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <button type="button" onClick={createChatSession} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-brand-hover">
                <Plus size={15} /> {chatLabels.newChat}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
              {chatSessions.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-gray-400">{chatLabels.noHistory}</p>
              ) : chatSessions.map((session) => (
                <div key={session.id} className={`group mb-2 flex items-center rounded-2xl border p-1 transition-colors ${session.id === activeSessionId ? "border-brand bg-brand/5" : "border-gray-100 bg-white hover:border-brand/25"}`}>
                  <button type="button" onClick={() => openChatSession(session)} className={`min-w-0 flex-1 px-3 py-2.5 text-left text-xs font-semibold ${session.id === activeSessionId ? "text-brand" : "text-gray-600"}`}>
                    <span className="block truncate">{session.title || chatLabels.newChat}</span>
                    {session.updated_at && <span className="mt-1 block text-[10px] font-normal text-gray-400">{new Date(session.updated_at).toLocaleDateString(lang === "tr" ? "tr-TR" : lang)}</span>}
                  </button>
                  <button type="button" onClick={() => deleteChatSession(session)} className="mr-1 rounded-xl p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500" aria-label={chatLabels.delete}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

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
