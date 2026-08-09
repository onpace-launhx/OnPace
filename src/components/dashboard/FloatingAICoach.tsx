"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, X, Send, Loader2, MessageSquare, CalendarPlus, Check, Clock } from "lucide-react";
import { AIResponseCard } from "@/components/ai/AIResponseCard";

interface CoachMessage {
  sender: "user" | "coach";
  text: string;
}

interface CoachProfile {
  language?: string;
}

interface PendingAction {
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
}

export function FloatingAICoach() {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [proactiveMsg, setProactiveMsg] = useState<string | null>(null);
  const [showBubble, setShowBubble] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [guestLanguage, setGuestLanguage] = useState("en");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lang = profile?.language || guestLanguage;
  const copy = {
    en: {
      title: "OnPace AI Study Coach",
      coachLabel: "AI Coach",
      status: "Online & ready to assist",
      empty: "Start a conversation with your AI Study Coach!",
      thinking: "Thinking...",
      placeholder: "Ask anything about your studies...",
      login: "Sign in first so I can safely use your real tasks, notes, and calendar.",
      connectionError: "A connection issue occurred. Please try again.",
      actionFailed: "The action could not be completed.",
      taskWillBeAdded: "Will be added as a new task",
      timeBooked: "This time is booked",
      suggestedFreeTime: "Suggested free time",
      useFreeTime: "Yes, use free time",
      addIt: "Yes, add it",
      addAnyway: "No, add anyway",
      cancel: "No, cancel",
      taskSaved: "Your new task was saved.",
      calendarSaved: "The calendar event was saved and your schedule has been updated.",
      calendarSyncPending: "The calendar event was saved; Google Calendar sync will be retried later.",
      open: "Open AI Coach",
      close: "Close AI Coach",
      answerLabel: "OnPace Coach",
    },
    tr: {
      title: "OnPace Yapay Zeka Çalışma Koçu",
      coachLabel: "Yapay Zeka Koçu",
      status: "Çevrimiçi ve yardıma hazır",
      empty: "Yapay Zeka Çalışma Koçunuz ile konuşmaya başlayın!",
      thinking: "Düşünüyor...",
      placeholder: "Çalışmalarınızla ilgili bir şey sorun...",
      login: "Gerçek görevlerinizi, notlarınızı ve takviminizi güvenle kullanabilmem için önce giriş yapın.",
      connectionError: "Bir bağlantı hatası oluştu. Lütfen tekrar deneyin.",
      actionFailed: "İşlem tamamlanamadı.",
      taskWillBeAdded: "Yeni görev olarak eklenecek",
      timeBooked: "Bu saat dolu",
      suggestedFreeTime: "Önerilen boş saat",
      useFreeTime: "Evet, boş saati kullan",
      addIt: "Evet, ekle",
      addAnyway: "Hayır, yine de ekle",
      cancel: "Hayır, vazgeç",
      taskSaved: "Yeni görev kaydedildi.",
      calendarSaved: "Takvim etkinliği kaydedildi ve görünüm güncellendi.",
      calendarSyncPending: "Takvim etkinliği kaydedildi; Google Takvim senkronizasyonu daha sonra yeniden denenecek.",
      open: "Yapay zeka koçunu aç",
      close: "Yapay zeka koçunu kapat",
      answerLabel: "OnPace Çalışma Koçu",
    },
    es: {
      title: "Coach de Estudio con IA de OnPace",
      coachLabel: "Coach de IA",
      status: "En línea y listo para ayudarte",
      empty: "¡Empieza una conversación con tu coach de estudio de IA!",
      thinking: "Pensando...",
      placeholder: "Pregunta sobre tus estudios...",
      login: "Inicia sesión para que pueda usar de forma segura tus tareas, notas y calendario reales.",
      connectionError: "Se produjo un problema de conexión. Inténtalo de nuevo.",
      actionFailed: "No se pudo completar la acción.",
      taskWillBeAdded: "Se añadirá como una nueva tarea",
      timeBooked: "Esta hora está ocupada",
      suggestedFreeTime: "Horario libre sugerido",
      useFreeTime: "Sí, usar horario libre",
      addIt: "Sí, añadir",
      addAnyway: "No, añadir de todos modos",
      cancel: "No, cancelar",
      taskSaved: "La nueva tarea se guardó.",
      calendarSaved: "El evento se guardó y tu agenda se actualizó.",
      calendarSyncPending: "El evento se guardó; la sincronización con Google Calendar se reintentará más tarde.",
      open: "Abrir coach de IA",
      close: "Cerrar coach de IA",
      answerLabel: "Coach OnPace",
    },
    zh: {
      title: "OnPace AI 学习教练",
      coachLabel: "AI 学习教练",
      status: "在线并随时提供帮助",
      empty: "开始与您的 AI 学习教练对话！",
      thinking: "思考中...",
      placeholder: "询问任何学习相关问题...",
      login: "请先登录，以便我安全地使用您的真实任务、笔记和日历。",
      connectionError: "连接出现问题，请重试。",
      actionFailed: "无法完成此操作。",
      taskWillBeAdded: "将作为新任务添加",
      timeBooked: "这个时间已被占用",
      suggestedFreeTime: "建议的空闲时间",
      useFreeTime: "是，使用空闲时间",
      addIt: "是，添加",
      addAnyway: "否，仍然添加",
      cancel: "否，取消",
      taskSaved: "新任务已保存。",
      calendarSaved: "日历活动已保存，日程已更新。",
      calendarSyncPending: "日历活动已保存；稍后会重新尝试同步 Google 日历。",
      open: "打开 AI 学习教练",
      close: "关闭 AI 学习教练",
      answerLabel: "OnPace AI 学习教练",
    },
  }[lang as "en" | "tr" | "es" | "zh"] || {
    title: "OnPace AI Study Coach",
    coachLabel: "AI Coach",
    status: "Online & ready to assist",
    empty: "Start a conversation with your AI Study Coach!",
    thinking: "Thinking...",
    placeholder: "Ask anything about your studies...",
    login: "Sign in first so I can safely use your real tasks, notes, and calendar.",
    connectionError: "A connection issue occurred. Please try again.",
    actionFailed: "The action could not be completed.",
    taskWillBeAdded: "Will be added as a new task",
    timeBooked: "This time is booked",
    suggestedFreeTime: "Suggested free time",
    useFreeTime: "Yes, use free time",
    addIt: "Yes, add it",
    addAnyway: "No, add anyway",
    cancel: "No, cancel",
    taskSaved: "Your new task was saved.",
    calendarSaved: "The calendar event was saved and your schedule has been updated.",
    calendarSyncPending: "The calendar event was saved; Google Calendar sync will be retried later.",
    open: "Open AI Coach",
    close: "Close AI Coach",
    answerLabel: "OnPace Coach",
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Load Profile & Setup Session Sync
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    async function loadSessionAndHistory() {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionChecked(true);
      setIsAuthenticated(Boolean(session?.user));

      if (!session?.user) {
        const browserLanguage = navigator.language.toLowerCase();
        const detectedLanguage = browserLanguage.startsWith("tr")
          ? "tr"
          : browserLanguage.startsWith("es")
            ? "es"
            : browserLanguage.startsWith("zh")
              ? "zh"
              : "en";
        setGuestLanguage(detectedLanguage);
        const guestTips: Record<string, string> = {
          tr: "OnPace'e hoş geldin! Giriş yaptığında AI Çalışma Koçu görevlerini ve takvimini kullanarak sana özel planlar hazırlayabilir. 🚀",
          en: "Welcome to OnPace! Sign in and your AI Study Coach can build plans from your real tasks and calendar. 🚀",
          es: "¡Te damos la bienvenida a OnPace! Inicia sesión para que tu coach de IA cree planes con tus tareas y calendario reales. 🚀",
          zh: "欢迎使用 OnPace！登录后，AI 学习教练可根据您的真实任务和日历制定个性化计划。🚀",
        };

        setTimeout(() => {
          setProactiveMsg(guestTips[detectedLanguage]);
          setShowBubble(true);
        }, 3000);
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (prof) {
        setProfile(prof);

        // Fetch real DB tasks & study sessions to construct personalized proactive advice
        const { data: userTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", session.user.id)
          .neq("status", "completed")
          .limit(20);

        const { data: userSessions } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .gte("start_time", new Date().toISOString())
          .limit(20);

        let tip = "";
        const uLang = prof.language || "en";

        if (uLang === "tr") {
          if (userTasks && userTasks.length > 0) {
            const highTask = userTasks.find(
              (t: { priority?: string }) => t.priority === "high"
            );
            if (highTask) {
              tip = `Yapılacak önemli bir görevin var: "${highTask.title}". Bitirmeyi unutma! 🎯`;
            } else {
              tip = `Bugün yapılacak ${userTasks.length} görev gözüküyor. Hepsini tamamlayalım! 💪`;
            }
          } else {
            tip = "Bugün için aktif görevin yok. Çalışma planı oluşturmak ister misin? 🧠";
          }
          if (userSessions && userSessions.length > 0) {
            tip += ` Ayrıca takviminde ${userSessions.length} ders oturumu planlanmış!`;
          }
        } else if (uLang === "es") {
          if (userTasks && userTasks.length > 0) {
            const highTask = userTasks.find(
              (task: { priority?: string }) => task.priority === "high"
            );
            tip = highTask
              ? `Tienes una tarea prioritaria: "${highTask.title}". ¿La planificamos? 🎯`
              : `Tienes ${userTasks.length} tareas activas. Puedo ayudarte a organizarlas. 💪`;
          } else {
            tip = "No tienes tareas activas. ¿Creamos tu próximo plan de estudio? 🧠";
          }
          if (userSessions && userSessions.length > 0) {
            tip += ` Además, tienes ${userSessions.length} sesiones próximas en el calendario.`;
          }
        } else if (uLang === "zh") {
          if (userTasks && userTasks.length > 0) {
            const highTask = userTasks.find(
              (task: { priority?: string }) => task.priority === "high"
            );
            tip = highTask
              ? `您有一项高优先级任务：“${highTask.title}”。要一起安排吗？🎯`
              : `您有 ${userTasks.length} 项待办学习任务。我可以帮助您安排。💪`;
          } else {
            tip = "您目前没有待办任务。要制定下一份学习计划吗？🧠";
          }
          if (userSessions && userSessions.length > 0) {
            tip += ` 此外，您的日历中还有 ${userSessions.length} 个即将开始的学习时段。`;
          }
        } else {
          if (userTasks && userTasks.length > 0) {
            const highTask = userTasks.find(
              (t: { priority?: string }) => t.priority === "high"
            );
            if (highTask) {
              tip = `You have a high-priority task: "${highTask.title}". Let's finish it! 🎯`;
            } else {
              tip = `You have ${userTasks.length} study tasks active. Let me help you complete them! 💪`;
            }
          } else {
            tip = "Your task list is clean! Want me to help you plan your next study module? 🧠";
          }
          if (userSessions && userSessions.length > 0) {
            tip += ` Plus, you have ${userSessions.length} calendar sessions scheduled!`;
          }
        }

        setTimeout(() => {
          setProactiveMsg(tip);
          setShowBubble(true);
        }, 3500);
      }
    }

    loadSessionAndHistory();
  }, [supabase, pathname]);

  const openNewCoachChat = async () => {
    setIsOpen(true);
    setShowBubble(false);
    setMessages([]);
    setPendingAction(null);
    if (!isAuthenticated) return;

    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New study chat" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.session?.id) {
        throw new Error(data.error || "Unable to create a new chat.");
      }
      setActiveSessionId(data.session.id);
    } catch (error) {
      setMessages([{ sender: "coach", text: error instanceof Error ? error.message : copy.connectionError }]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (isAuthenticated && !activeSessionId) return;

    const userText = input.trim();
    setInput("");
    setPendingAction(null);

    const newMessages: CoachMessage[] = [
      ...messages,
      { sender: "user", text: userText },
    ];
    setMessages(newMessages);

    if (!isAuthenticated) {
      setMessages([...newMessages, { sender: "coach", text: copy.login }]);
      return;
    }

    setLoading(true);

    try {
      const actionKeywords = /\b(calendar|schedule|add|create|task|takvim|planla|ekle|oluştur|görev)\b/i.test(userText);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const dateParts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const datePart = (type: Intl.DateTimeFormatPartTypes) =>
        dateParts.find((part) => part.type === type)?.value || "";
      const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;

      const chatRequest = fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          // The server loads and records this session, keeping both coach
          // surfaces on one durable conversation rather than browser memory.
          sessionId: activeSessionId,
        }),
      });
      const proposalRequest = actionKeywords
        ? fetch("/api/assistant/propose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, today, timeZone, language: lang }),
          })
            .then((response) => response.json().catch(() => null))
            .catch(() => null)
        : Promise.resolve(null);
      const [response, proposalResult] = await Promise.all([
        chatRequest,
        proposalRequest,
      ]);

      const responseBody = await response.text();
      let data: { reply?: unknown; text?: unknown; error?: unknown; message?: unknown } = {};
      try {
        data = responseBody ? JSON.parse(responseBody) : {};
      } catch {
        // Preserve a safe non-JSON response from a proxy or stale Function.
      }
      if (!response.ok) {
        // Do not discard the API's explanation. The compact coach shares the
        // same backend as the main assistant, so both surfaces must expose an
        // actionable error instead of a misleading connection-only message.
        throw new Error(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : typeof data.message === "string" && data.message.trim()
              ? data.message
              : responseBody.trim().slice(0, 300) || `${copy.connectionError} (HTTP ${response.status})`
        );
      }
      const reply = typeof data.reply === "string" ? data.reply : typeof data.text === "string" ? data.text : "";
      if (!reply) {
        throw new Error("AI returned an empty response.");
      }

      setMessages((prev) => [...prev, { sender: "coach", text: reply }]);
      if (proposalResult?.proposal) {
        setPendingAction(proposalResult.proposal as PendingAction);
      } else if (typeof proposalResult?.followUp === "string") {
        setMessages((prev) => [
          ...prev,
          { sender: "coach", text: proposalResult.followUp },
        ]);
      }

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text:
            error instanceof Error
              ? error.message
              : copy.connectionError,
        },
      ]);
    }
    setLoading(false);
  };

  const formatTimeRange = (start?: string, end?: string) => {
    if (!start || !end) return "";
    const formatter = new Intl.DateTimeFormat(
      lang === "tr" ? "tr-TR" : lang === "es" ? "es-ES" : lang === "zh" ? "zh-CN" : "en-US",
      { hour: "2-digit", minute: "2-digit" }
    );
    return `${formatter.format(new Date(start))}–${formatter.format(new Date(end))}`;
  };

  const confirmPendingAction = async (choice: "original" | "alternative") => {
    if (!pendingAction || savingAction) return;
    setSavingAction(true);
    try {
      const response = await fetch("/api/assistant/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal: pendingAction, choice }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || copy.actionFailed);
      }

      let syncWarning = false;
      if (result.type === "calendar") {
        window.dispatchEvent(new CustomEvent("onpace-calendar-updated"));
        if (result.shouldSync) {
          const syncResponse = await fetch("/api/calendar/sync", { method: "POST" });
          if (!syncResponse.ok) {
            syncWarning = true;
          }
        }
      } else {
        window.dispatchEvent(new CustomEvent("onpace-tasks-updated"));
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text: result.type === "calendar"
            ? syncWarning
              ? copy.calendarSyncPending
              : copy.calendarSaved
            : copy.taskSaved,
        },
      ]);
      setPendingAction(null);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text:
            error instanceof Error
              ? error.message
              : copy.actionFailed,
        },
      ]);
    } finally {
      setSavingAction(false);
    }
  };

  if (pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/updates") || pathname.startsWith("/ai-assistant") || !sessionChecked || !isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-50 flex flex-col items-end pointer-events-auto sm:bottom-6 sm:right-6">
      {/* Proactive Speech Bubble */}
      {showBubble && !isOpen && proactiveMsg && (
        <div className="mb-3 max-w-xs bg-white rounded-2xl p-4 shadow-xl border border-gray-150 relative animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            onClick={() => setShowBubble(false)}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
          >
            <X size={13} />
          </button>
          <div className="flex items-start gap-2.5">
            <div className="h-7 w-7 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={14} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand mb-0.5">
                {copy.coachLabel}
              </p>
              <p className="text-xs text-surface-dark leading-relaxed font-medium">
                {proactiveMsg}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => void openNewCoachChat()}
          className="h-14 w-14 rounded-full bg-gradient-to-tr from-brand to-brand-dark text-white shadow-xl shadow-brand/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
          aria-label={copy.open}
        >
          <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
          <div className="h-[min(520px,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-[400px] rounded-3xl border border-gray-150 bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 sm:w-[400px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand to-brand-dark p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">{copy.title}</h3>
                <p className="text-[10px] text-white/80 font-medium">
                  {copy.status}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
              aria-label={copy.close}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gray-50/50">
            {messages.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <MessageSquare className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-400 font-medium">
                  {copy.empty}
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.sender === "coach" ? (
                    <div className="max-w-[92%] min-w-0">
                      <AIResponseCard content={m.text} label={copy.answerLabel} compact />
                    </div>
                  ) : (
                    <div className="max-w-[82%] rounded-2xl rounded-br-none bg-brand px-3.5 py-2.5 text-xs font-medium leading-relaxed text-white shadow-sm">
                      <span className="content-break-anywhere whitespace-pre-wrap">{m.text}</span>
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-150 px-3.5 py-2.5 rounded-2xl rounded-bl-none text-xs text-gray-400 flex items-center gap-2 shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                  <span>{copy.thinking}</span>
                </div>
              </div>
            )}
            {pendingAction && (
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-3.5 space-y-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded-xl bg-brand/10 p-2 text-brand">
                    {pendingAction.type === "calendar" ? <CalendarPlus size={15} /> : <Check size={15} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-surface-dark truncate">{pendingAction.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                      {pendingAction.type === "calendar"
                        ? formatTimeRange(pendingAction.startTime, pendingAction.endTime)
                        : copy.taskWillBeAdded}
                    </p>
                  </div>
                </div>

                {pendingAction.type === "calendar" && pendingAction.conflict && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Clock size={13} />
                      {copy.timeBooked}
                    </div>
                    <p>
                      {pendingAction.conflict.events
                        .map((event) => `${event.title} (${formatTimeRange(event.startTime, event.endTime)})`)
                        .join(", ")}
                    </p>
                    {pendingAction.conflict.alternativeStart && pendingAction.conflict.alternativeEnd && (
                      <p className="font-semibold text-emerald-700">
                        {copy.suggestedFreeTime}: {formatTimeRange(pendingAction.conflict.alternativeStart, pendingAction.conflict.alternativeEnd)}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {pendingAction.type === "calendar" && pendingAction.conflict?.alternativeStart ? (
                    <button
                      type="button"
                      onClick={() => void confirmPendingAction("alternative")}
                      disabled={savingAction}
                      className="rounded-xl bg-emerald-600 px-2 py-2.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {copy.useFreeTime}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void confirmPendingAction("original")}
                      disabled={savingAction}
                      className="rounded-xl bg-emerald-600 px-2 py-2.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {copy.addIt}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      pendingAction.type === "calendar" && pendingAction.conflict
                        ? void confirmPendingAction("original")
                        : setPendingAction(null)
                    }
                    disabled={savingAction}
                    className="rounded-xl bg-brand px-2 py-2.5 text-[11px] font-bold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {pendingAction.type === "calendar" && pendingAction.conflict
                      ? copy.addAnyway
                      : copy.cancel}
                  </button>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={copy.placeholder}
              className="min-w-0 flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || (isAuthenticated && !activeSessionId)}
              className="p-2.5 bg-brand text-white rounded-xl hover:bg-brand-hover active:scale-95 disabled:opacity-40 cursor-pointer transition-all shrink-0"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
