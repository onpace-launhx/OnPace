"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Send,
  Loader2,
  BrainCircuit,
  MessageSquare,
  HelpCircle,
  Clock,
  Lock,
  Plus,
  Trash2,
  X,
  CalendarPlus,
  Check
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { PersonalizedLearningStudio } from "@/components/dashboard/PersonalizedLearningStudio";
import { StudyVisual } from "@/components/ai/StudyVisual";
import type { StudyVisualSpec } from "@/lib/study-visual";
import { AIResponseCard } from "@/components/ai/AIResponseCard";

type Profile = {
  id: string;
  language?: string | null;
  plan?: string | null;
  trial_ends_at?: string | null;
};

type Course = {
  id: string;
  name: string;
};

type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
};

type ChatSession = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};
type PendingAction = {
  type: "calendar" | "task";
  title: string;
  priority?: "low" | "medium" | "high";
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  conflict?: {
    events: Array<{ title: string; startTime: string; endTime: string }>;
    alternativeStart: string | null;
    alternativeEnd: string | null;
  } | null;
};

export default function AiAssistantPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const initialChatSetupStarted = useRef(false);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [studyVisual, setStudyVisual] = useState<StudyVisualSpec | null>(null);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  // Premium modal popup & Custom alerts
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);
  const localized = <T,>(values: { en: T; tr: T; es: T; zh: T }): T =>
    values[( ["en", "tr", "es", "zh"].includes(lang) ? lang : "en") as keyof typeof values];
  const chatCopy = {
    en: {
      newChat: "New chat",
      history: "Chat history",
      suggestions: "Suggested queries",
      noHistory: "No saved conversations yet.",
      delete: "Delete conversation",
      deleteConfirm: "Delete this AI conversation?",
      conversationCount: "conversations",
      visualButton: "Visual diagram",
      visualTitle: "Generate a structured visual study aid",
      visualSourceRequired: "Enter a topic to visualize first.",
      visualError: "Study visual could not be created.",
      thinking: "Study Coach is thinking...",
      coursePrompt: "Ask the study coach about {course}...",
      closeHistory: "Close chat history",
      answerLabel: "OnPace Study Coach",
      serviceError: "The study coach could not answer right now. Please try again in a moment.",
    },
    tr: {
      newChat: "Yeni sohbet",
      history: "Sohbet geçmişi",
      suggestions: "Önerilen başlangıçlar",
      noHistory: "Henüz kayıtlı sohbet yok.",
      delete: "Sohbeti sil",
      deleteConfirm: "Bu AI sohbetini silmek istediğinize emin misiniz?",
      conversationCount: "sohbet",
      visualButton: "Görsel şema",
      visualTitle: "Yapılandırılmış görsel çalışma desteği oluştur",
      visualSourceRequired: "Önce görselleştirilecek bir konu yazın.",
      visualError: "Görsel çalışma desteği oluşturulamadı.",
      thinking: "Çalışma koçu düşünüyor...",
      coursePrompt: "{course} hakkında çalışma koçuna sor...",
      closeHistory: "Sohbet geçmişini kapat",
      answerLabel: "OnPace Çalışma Koçu",
      serviceError: "Çalışma koçu şu anda yanıt veremedi. Lütfen biraz sonra tekrar deneyin.",
    },
    es: {
      newChat: "Nuevo chat",
      history: "Historial de chats",
      suggestions: "Consultas sugeridas",
      noHistory: "Aún no hay conversaciones guardadas.",
      delete: "Eliminar conversación",
      deleteConfirm: "¿Eliminar esta conversación con la IA?",
      conversationCount: "conversaciones",
      visualButton: "Esquema visual",
      visualTitle: "Generar una ayuda visual de estudio estructurada",
      visualSourceRequired: "Escribe primero un tema para visualizar.",
      visualError: "No se pudo crear la ayuda visual de estudio.",
      thinking: "El asesor de estudio está pensando...",
      coursePrompt: "Pregunta al asesor de estudio sobre {course}...",
      closeHistory: "Cerrar historial de chats",
      answerLabel: "Coach de Estudio OnPace",
      serviceError: "El asesor no pudo responder ahora. Inténtalo de nuevo en un momento.",
    },
    zh: {
      newChat: "新对话",
      history: "对话历史",
      suggestions: "建议问题",
      noHistory: "还没有保存的对话。",
      delete: "删除对话",
      deleteConfirm: "要删除这段 AI 对话吗？",
      conversationCount: "个对话",
      visualButton: "学习图示",
      visualTitle: "生成结构化的学习图示",
      visualSourceRequired: "请先输入要生成图示的主题。",
      visualError: "无法生成学习图示。",
      thinking: "学习教练正在思考...",
      coursePrompt: "向学习教练询问 {course}...",
      closeHistory: "关闭对话历史",
      answerLabel: "OnPace AI 学习教练",
      serviceError: "学习教练暂时无法回答，请稍后重试。",
    },
  }[lang as "en" | "tr" | "es" | "zh"] || {
    newChat: "New chat",
    history: "Chat history",
    suggestions: "Suggested queries",
    noHistory: "No saved conversations yet.",
    delete: "Delete conversation",
    deleteConfirm: "Delete this AI conversation?",
    conversationCount: "conversations",
    visualButton: "Visual diagram",
    visualTitle: "Generate a structured visual study aid",
    visualSourceRequired: "Enter a topic to visualize first.",
    visualError: "Study visual could not be created.",
    thinking: "Study Coach is thinking...",
    coursePrompt: "Ask the study coach about {course}...",
    closeHistory: "Close chat history",
    serviceError: "The study coach could not answer right now. Please try again in a moment.",
  };

  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatHydrated, setChatHydrated] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null);
  const [emptyDraftSessionId, setEmptyDraftSessionId] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"chat" | "personalized">("chat");

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (requestedMode === "personalized") setWorkspaceMode("personalized");
  }, []);

  useEffect(() => {
    if (initialChatSetupStarted.current) return;
    initialChatSetupStarted.current = true;

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
      
      setProfile(profileData as Profile | null);

      // Load courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id);
      if (coursesData) setCourses(coursesData as Course[]);

      try {
        const sessionsResponse = await fetch("/api/chat/sessions");
        const sessionsData = await sessionsResponse.json().catch(() => ({}));
        if (!sessionsResponse.ok) throw new Error(sessionsData.error || "Unable to load chat history.");
        const previousSessions = (sessionsData.sessions || []) as ChatSession[];
        // Opening the assistant always starts a blank, durable conversation.
        // Older conversations remain available from the history panel.
        const createResponse = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "New study chat" }),
        });
        const createData = await createResponse.json().catch(() => ({}));
        if (!createResponse.ok || !createData.session) {
          throw new Error(createData.error || "Unable to create a new chat.");
        }
        const newSession = createData.session as ChatSession;
        setChatSessions([newSession, ...previousSessions]);
        setActiveSessionId(newSession.id);
        setEmptyDraftSessionId(newSession.id);
        setMessages([]);
      } catch (err) {
        console.error("Error loading chat history:", err);
        setCustomAlert(err instanceof Error ? err.message : "Unable to load chat history.");
      } finally {
        setChatHydrated(true);
      }

      setLoading(false);
    }
    loadProfileAndChat();
  }, [router, supabase]);

  const openChatSession = async (session: ChatSession) => {
    if (!session?.id || openingSessionId) return;
    setOpeningSessionId(session.id);
    setShowChatHistory(false);
    setPendingAction(null);
    setStudyVisual(null);

    // The blank chat created on entry is only a draft. Do not retain it when
    // the student chooses a previous conversation before sending a message.
    if (activeSessionId === emptyDraftSessionId && activeSessionId !== session.id) {
      const draftId = activeSessionId;
      const deleteResponse = await fetch(`/api/chat/sessions?sessionId=${encodeURIComponent(draftId)}`, { method: "DELETE" });
      if (deleteResponse.ok) {
        setChatSessions((current) => current.filter((item) => item.id !== draftId));
        setEmptyDraftSessionId(null);
      }
    }

    const response = await fetch(`/api/chat/sessions?sessionId=${encodeURIComponent(session.id)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCustomAlert(data.error || "Unable to load this chat.");
      setOpeningSessionId(null);
      return;
    }
    setActiveSessionId(session.id);
    setMessages((data.messages || []) as ChatMessage[]);
    setOpeningSessionId(null);
  };

  const createChatSession = async () => {
    const response = await fetch("/api/chat/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New study chat" }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.session) {
      setCustomAlert(result.error || "Unable to create a new chat.");
      return;
    }
    const data = result.session as ChatSession;
    setChatSessions((current) => [data, ...current]);
    setActiveSessionId(data.id);
    setEmptyDraftSessionId(data.id);
    setMessages([]);
    setStudyVisual(null);
    setInputMsg("");
    setSelectedCourse("");
    setShowChatHistory(false);
  };

  const deleteChatSession = async (session: ChatSession) => {
    const confirmed = window.confirm(chatCopy.deleteConfirm);
    if (!confirmed) return;
    const response = await fetch(`/api/chat/sessions?sessionId=${encodeURIComponent(session.id)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCustomAlert(result.error || "Unable to delete chat.");
      return;
    }
    const remaining = chatSessions.filter((item) => item.id !== session.id);
    setChatSessions(remaining);
    if (session.id === emptyDraftSessionId) setEmptyDraftSessionId(null);
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
    if (chatHydrated && !loading && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: t.ai.welcomeMsg || "Hey! I'm your OnPace AI Study Coach. Select a course context or ask me anything. Let's build a smart study structure today!"
        }
      ]);
    }
  }, [chatHydrated, loading, t, messages.length]);

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
    if (!inputMsg.trim() || sending || loading || !activeSessionId) return;

    const userText = inputMsg.trim();
    setEmptyDraftSessionId(null);
    if (pendingAction && /^(onay|onayla|evet|yes|confirm|ok|tamam)$/i.test(userText)) {
      setInputMsg("");
      await confirmPendingAction("original");
      return;
    }
    const contextPrefix = selectedCourse ? `[Context: ${selectedCourse}] ` : "";
    const fullMessageText = `${contextPrefix}${userText}`;

    // Add user message to UI
    const userMessage: ChatMessage = { id: crypto.randomUUID(), sender: "user", text: fullMessageText };
    setMessages((prev) => [...prev, userMessage]);
    setInputMsg("");
    setSending(true);

    try {
      if (false && activeSessionId) {
        const { error: userMessageError } = await supabase.from("ai_chat_messages").insert([
          { session_id: activeSessionId, role: "user", content: fullMessageText }
        ]);
        if (userMessageError) {
          // A legacy chat table must not block the actual coach response.
          console.warn("Could not persist user chat message", userMessageError);
        }
        const sessionTitle = !messages.some((message) => message.sender === "user")
          ? userText.length > 42 ? `${userText.slice(0, 42)}…` : userText
          : undefined;
        await Promise.resolve(sessionTitle);
      }

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const dateParts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const datePart = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((part) => part.type === type)?.value || "";
      const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
      const actionKeywords = /\b(calendar|schedule|add|create|task|takvim|planla|ekle|oluştur|görev|tomorrow|today|yarın|bugün|mañana|hoy)\b|\bsaat\s*\d{1,2}\b|\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s*(am|pm)\b/i.test(userText);
      const chatRequest = fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: fullMessageText,
          sessionId: activeSessionId,
        }),
      });
      const proposalRequest = actionKeywords
        ? fetch("/api/assistant/propose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userText, today, timeZone, language: lang }) }).then((proposalResponse) => proposalResponse.json().catch(() => null)).catch(() => null)
        : Promise.resolve(null);
      const [response, proposalResult] = await Promise.all([chatRequest, proposalRequest]);

      const responseBody = await response.text();
      let data: { reply?: unknown; text?: unknown; error?: unknown; message?: unknown } = {};
      try {
        data = responseBody ? JSON.parse(responseBody) : {};
      } catch {
        // A proxy or an older Edge Function can return a non-JSON error page.
        // Keep its safe text so the failure is actionable rather than generic.
      }
      if (!response.ok) {
        if (response.status === 429) {
          setCustomAlert(t.ai.limitError || (typeof data.error === "string" ? data.error : ""));
          setPremiumModalOpen(true);
        }
        // Preserve the server's actionable message. Previously every failed
        // request was turned into the same generic sentence, which hid
        // provider/configuration failures and made the coach impossible to
        // diagnose for both the student and support.
        throw new Error(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : typeof data.message === "string" && data.message.trim()
              ? data.message
              : responseBody.trim().slice(0, 300) || `${chatCopy.serviceError} (HTTP ${response.status})`
        );
      }
      const reply = typeof data.reply === "string" ? data.reply : typeof data.text === "string" ? data.text : "";
      if (!reply) {
        throw new Error("AI returned an empty response.");
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), sender: "ai", text: reply }
      ]);
      if (proposalResult?.proposal) {
        setPendingAction(proposalResult.proposal as PendingAction);
      } else if (typeof proposalResult?.followUp === "string") {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: "ai", text: proposalResult.followUp }]);
      }

      if (false && activeSessionId) {
        const { error: assistantMessageError } = await supabase.from("ai_chat_messages").insert([
          { session_id: activeSessionId, role: "assistant", content: reply }
        ]);
        if (assistantMessageError) {
          console.warn("Could not persist assistant chat message", assistantMessageError);
        } else {
          await Promise.resolve();
        }
      }

      const sessionsResponse = await fetch("/api/chat/sessions");
      const sessionsData = await sessionsResponse.json().catch(() => ({}));
      if (sessionsResponse.ok) setChatSessions((sessionsData.sessions || []) as ChatSession[]);

      const requestsVisual = /\b(diagram|visual|flowchart|flow chart|timeline|concept map|schema|scheme|diagrama|mapa visual|línea de tiempo)\b|şema|akış|zaman çizelgesi|kavram haritası|图示|流程图|时间线|概念图/i.test(userText);
      if (requestsVisual) {
        setGeneratingVisual(true);
        try {
          const visualResponse = await fetch("/api/study-visual", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: `${fullMessageText}\n\n${reply}`,
              title: selectedCourse || userText,
              language: lang,
            }),
          });
          const visualData = await visualResponse.json();
          if (visualResponse.ok && visualData.visual) setStudyVisual(visualData.visual);
        } catch {
          // The text answer remains usable when the optional diagram cannot be rendered.
        } finally {
          setGeneratingVisual(false);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          text: `⚠️ ${error instanceof Error ? error.message : chatCopy.serviceError}`,
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
    : lang === "tr"
    ? [
        "Fotosentezi 3 maddeyle açıkla",
        "AP Kimya için 3 adımlı çalışma planı oluştur",
        "10 sayfalık tarih ödevini küçük parçalara ayırmama yardım et",
        "SAT matematik için 3 alıştırma sorusu hazırla"
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
      setCustomAlert(chatCopy.visualSourceRequired);
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
      if (!response.ok || !data.visual) throw new Error(data.error || chatCopy.visualError);
      setStudyVisual(data.visual);
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : chatCopy.visualError);
    } finally {
      setGeneratingVisual(false);
    }
  };

  const confirmPendingAction = async (choice: "original" | "alternative") => {
    if (!pendingAction || savingAction) return;
    setSavingAction(true);
    try {
      const response = await fetch("/api/assistant/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposal: pendingAction, choice }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save this action.");
      let syncWarning = false;
      if (result.type === "calendar") {
        window.dispatchEvent(new CustomEvent("onpace-calendar-updated"));
        if (result.shouldSync) {
          const syncResponse = await fetch("/api/calendar/sync", { method: "POST" });
          syncWarning = !syncResponse.ok;
        }
      } else {
        window.dispatchEvent(new CustomEvent("onpace-tasks-updated"));
      }
      setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "ai", text: result.type === "calendar" ? syncWarning ? localized({ en: "✅ Added to your OnPace calendar. Google Calendar sync will retry automatically.", tr: "✅ OnPace takvimine eklendi. Google Takvim eşitlemesi otomatik olarak yeniden denenecek.", es: "✅ Añadido a tu calendario de OnPace. La sincronización con Google Calendar se reintentará automáticamente.", zh: "✅ 已添加到您的 OnPace 日历。Google 日历同步将自动重试。" }) : result.shouldSync ? localized({ en: "✅ Added to your OnPace calendar and synchronized with Google Calendar.", tr: "✅ OnPace takvimine eklendi ve Google Takvim ile eşitlendi.", es: "✅ Añadido a tu calendario de OnPace y sincronizado con Google Calendar.", zh: "✅ 已添加到您的 OnPace 日历并同步到 Google 日历。" }) : localized({ en: "✅ Added to your OnPace calendar.", tr: "✅ OnPace takvimine eklendi.", es: "✅ Añadido a tu calendario de OnPace.", zh: "✅ 已添加到您的 OnPace 日历。" }) : localized({ en: "✅ Added to your tasks.", tr: "✅ Görevlerine eklendi.", es: "✅ Añadido a tus tareas.", zh: "✅ 已添加到您的任务。" }) }]);
      setPendingAction(null);
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : chatCopy.serviceError);
    } finally {
      setSavingAction(false);
    }
  };

  const chatLabels = chatCopy;

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] flex-1 flex-col overflow-hidden p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 lg:px-8 lg:py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-surface-dark">
              <BrainCircuit className="shrink-0 text-brand" /> {workspaceLabels.title}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">{workspaceLabels.subtitle}</p>
          </div>
          {workspaceMode === "chat" && (
            <button
              type="button"
              onClick={() => setShowChatHistory(true)}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:border-brand/40 hover:text-brand sm:hidden"
              aria-label={chatLabels.history}
              title={chatLabels.history}
            >
              <Clock size={17} />
            </button>
          )}
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
      <div className="mt-4 flex flex-wrap items-center gap-2 shrink-0">
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
      <div ref={chatScrollRef} className="my-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain rounded-[2rem] border border-gray-150 bg-gradient-to-b from-white to-slate-50/35 p-4 shadow-sm sm:p-6 lg:p-7">
        {messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                isAi ? "w-full max-w-5xl" : "ml-auto max-w-[88%] flex-row-reverse sm:max-w-[72%]"
              }`}
            >
              {isAi ? (
                <div className="min-w-0 w-full">
                  <AIResponseCard content={msg.text} label={chatCopy.answerLabel} />
                </div>
              ) : (
                <>
                  <div className="rounded-3xl rounded-tr-md bg-brand px-5 py-3.5 text-sm leading-6 text-white shadow-sm">
                    <p className="content-break-anywhere whitespace-pre-line">{msg.text}</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-extrabold text-gray-600 ring-1 ring-gray-200">ME</div>
                </>
              )}
            </div>
          );
        })}
        {studyVisual && (
          <div className="mx-auto w-full max-w-3xl py-2">
            <StudyVisual visual={studyVisual} />
          </div>
        )}
        {pendingAction && (
          <article className="mx-auto w-full max-w-3xl rounded-3xl border border-brand/20 bg-brand/5 p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">{pendingAction.type === "calendar" ? <CalendarPlus size={19} /> : <Check size={19} />}</span><div className="min-w-0"><p className="text-sm font-extrabold text-surface-dark">{pendingAction.title}</p><p className="mt-1 text-xs leading-5 text-gray-600">{pendingAction.type === "calendar" && pendingAction.startTime ? new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : lang === "es" ? "es-ES" : lang === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(pendingAction.startTime)) : localized({ en: "This will be added to your task list.", tr: "Bu görev listene eklenecek.", es: "Se añadirá a tu lista de tareas.", zh: "这将添加到您的任务列表。" })}</p></div></div>
            {pendingAction.conflict && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{localized({ en: "This time conflicts with your calendar. Choose a free alternative or add it anyway.", tr: "Bu saat takviminle çakışıyor. Boş öneriyi kullanabilir veya yine de ekleyebilirsin.", es: "Esta hora coincide con tu calendario. Elige una alternativa libre o añádelo de todos modos.", zh: "此时间与您的日历冲突。您可以选择空闲时间或仍然添加。" })}</p>}
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={savingAction} onClick={() => void confirmPendingAction("original")} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-extrabold text-white hover:bg-brand-hover disabled:opacity-60">{savingAction && <Loader2 size={14} className="animate-spin" />}{pendingAction.conflict ? localized({ en: "Add anyway", tr: "Yine de ekle", es: "Añadir de todos modos", zh: "仍然添加" }) : localized({ en: "Confirm and add", tr: "Onayla ve ekle", es: "Confirmar y añadir", zh: "确认并添加" })}</button>{pendingAction.conflict?.alternativeStart && <button type="button" disabled={savingAction} onClick={() => void confirmPendingAction("alternative")} className="rounded-xl border border-brand/25 bg-white px-4 py-2.5 text-xs font-extrabold text-brand hover:bg-brand/5">{localized({ en: "Use free time", tr: "Boş saati kullan", es: "Usar hora libre", zh: "使用空闲时间" })}</button>}<button type="button" disabled={savingAction} onClick={() => setPendingAction(null)} className="rounded-xl px-3 py-2.5 text-xs font-bold text-gray-500 hover:bg-white">{localized({ en: "Not now", tr: "Şimdi değil", es: "Ahora no", zh: "暂不" })}</button></div>
          </article>
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
          <div className="flex max-w-3xl gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="flex items-center gap-1.5 rounded-3xl rounded-tl-sm border border-brand/10 bg-brand-light/30 px-5 py-3.5 text-sm font-medium text-gray-500">
                {chatCopy.thinking}
            </div>
          </div>
        )}
        <div />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSend} className="sticky bottom-0 z-20 flex shrink-0 items-end gap-2 rounded-[1.75rem] border border-gray-150 bg-white p-2.5 shadow-[0_14px_38px_rgba(15,23,42,0.10)] sm:p-3">
        <textarea
          rows={1}
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={selectedCourse ? chatCopy.coursePrompt.replace("{course}", selectedCourse) : (t.ai.placeholderChat || "Ask study coach...")}
          className="max-h-36 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-6 text-surface-dark outline-none placeholder-gray-400"
        />
        <button
          type="button"
          onClick={handleGenerateStudyVisual}
          disabled={generatingVisual || (!inputMsg.trim() && !messages.some((message) => message.sender === "user"))}
          className="flex items-center gap-1.5 rounded-2xl border border-brand/20 bg-brand/5 px-3 text-xs font-bold text-brand transition-all hover:bg-brand/10 disabled:opacity-40"
          title={chatCopy.visualTitle}
        >
          {generatingVisual ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          <span className="hidden sm:inline">{chatCopy.visualButton}</span>
        </button>
        <button
          type="submit"
          disabled={!inputMsg.trim() || sending || loading || !activeSessionId}
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
            aria-label={chatCopy.closeHistory}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
            onClick={() => setShowChatHistory(false)}
          />
          <aside className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl sm:w-[23rem]" aria-label={chatLabels.history}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
              <div>
                <p className="text-sm font-extrabold text-surface-dark">{chatLabels.history}</p>
                <p className="mt-0.5 text-xs text-gray-400">{chatSessions.length} {chatCopy.conversationCount}</p>
              </div>
              <button type="button" onClick={() => setShowChatHistory(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label={chatCopy.closeHistory}>
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
