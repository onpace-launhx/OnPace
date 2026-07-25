"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, X, Send, Loader2, MessageSquare } from "lucide-react";

interface CoachMessage {
  sender: "user" | "coach";
  text: string;
}

interface CoachProfile {
  language?: string;
}

export function FloatingAICoach() {
  const supabase = createClient();
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lang = profile?.language || guestLanguage;
  const copy = {
    en: {
      status: "Online & ready to assist",
      empty: "Start a conversation with your AI Study Coach!",
      thinking: "Thinking...",
      placeholder: "Ask anything about your studies...",
      login: "Sign in first so I can safely use your real tasks, notes, and calendar.",
    },
    tr: {
      status: "Çevrimiçi ve yardıma hazır",
      empty: "Yapay Zeka Çalışma Koçunuz ile konuşmaya başlayın!",
      thinking: "Düşünüyor...",
      placeholder: "Çalışmalarınızla ilgili bir şey sorun...",
      login: "Gerçek görevlerinizi, notlarınızı ve takviminizi güvenle kullanabilmem için önce giriş yapın.",
    },
    es: {
      status: "En línea y listo para ayudarte",
      empty: "¡Empieza una conversación con tu coach de estudio de IA!",
      thinking: "Pensando...",
      placeholder: "Pregunta sobre tus estudios...",
      login: "Inicia sesión para que pueda usar de forma segura tus tareas, notas y calendario reales.",
    },
    zh: {
      status: "在线并随时提供帮助",
      empty: "开始与您的 AI 学习教练对话！",
      thinking: "思考中...",
      placeholder: "询问任何学习相关问题...",
      login: "请先登录，以便我安全地使用您的真实任务、笔记和日历。",
    },
  }[lang as "en" | "tr" | "es" | "zh"] || {
    status: "Online & ready to assist",
    empty: "Start a conversation with your AI Study Coach!",
    thinking: "Thinking...",
    placeholder: "Ask anything about your studies...",
    login: "Sign in first so I can safely use your real tasks, notes, and calendar.",
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Load Profile & Setup Session Sync
  useEffect(() => {
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

        // Fetch or create active persistent AI chat session
        try {
          const { data: sessions } = await supabase
            .from("ai_chat_sessions")
            .select("id")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          let sessId = "";
          if (sessions && sessions.length > 0) {
            sessId = sessions[0].id;
          } else {
            const { data: newSess } = await supabase
              .from("ai_chat_sessions")
              .insert([{ user_id: session.user.id, title: "Study Assistant Chat" }])
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
                dbMsgs.map((m: { role: string; content: string }) => ({
                  sender: m.role === "user" ? "user" : "coach",
                  text: m.content,
                }))
              );
            }
          }
        } catch (err) {
          console.error("Failed to sync AI chat history:", err);
        }

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
  }, [supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

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
      // Save user message to persistent DB session
      if (activeSessionId) {
        await supabase.from("ai_chat_messages").insert([
          { session_id: activeSessionId, role: "user", content: userText },
        ]);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI service is unavailable.");
      }
      const reply = data.reply || data.text;
      if (!reply) {
        throw new Error("AI returned an empty response.");
      }

      setMessages((prev) => [...prev, { sender: "coach", text: reply }]);

      // Save assistant reply to persistent DB session
      if (activeSessionId) {
        await supabase.from("ai_chat_messages").insert([
          { session_id: activeSessionId, role: "assistant", content: reply },
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
              : lang === "tr"
                ? "Bir bağlantı hatası oluştu. Lütfen tekrar deneyin."
                : "Connection issue occurred. Please try again.",
        },
      ]);
    }
    setLoading(false);
  };

  if (!sessionChecked || (!isAuthenticated && pathname !== "/")) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
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
                AI COACH
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
          onClick={() => {
            setIsOpen(true);
            setShowBubble(false);
          }}
          className="h-14 w-14 rounded-full bg-gradient-to-tr from-brand to-brand-dark text-white shadow-xl shadow-brand/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
          aria-label="Open AI Coach"
        >
          <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-3xl shadow-2xl border border-gray-150 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand to-brand-dark p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">OnPace AI Study Coach</h3>
                <p className="text-[10px] text-white/80 font-medium">
                  {copy.status}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
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
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-brand text-white font-medium rounded-br-none shadow-sm"
                        : "bg-white border border-gray-150 text-surface-dark font-medium rounded-bl-none shadow-xs"
                    }`}
                  >
                    {m.text}
                  </div>
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
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
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
