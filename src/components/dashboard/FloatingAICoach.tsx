"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, X, Send, Loader2, MessageSquare, AlertCircle } from "lucide-react";
import { getTranslations } from "@/lib/translations";

export function FloatingAICoach() {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [proactiveMsg, setProactiveMsg] = useState<string | null>(null);
  const [showBubble, setShowBubble] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Load Profile & Setup Personalized Proactive Tips
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();

      // If user is logged out (e.g. on landing/index page)
      if (!session?.user) {
        const guestTip =
          lang === "tr"
            ? "OnPace'e hoş geldin! AI Çalışma Koçu ile notlarını analiz edebilir, sınavlarına %100 hazırlık yapabilirsin. 🚀"
            : "Welcome to OnPace! I'm your AI Study Coach. Prepare for your exams with smart structure and instant quizzes. 🚀";

        setTimeout(() => {
          setProactiveMsg(guestTip);
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

        // Fetch or create persistent AI chat session
        try {
          const { data: sessions } = await supabase
            .from("ai_chat_sessions")
            .select("id")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (sessions && sessions.length > 0) {
            const activeId = sessions[0].id;
            setActiveSessionId(activeId);

            const { data: dbMsgs } = await supabase
              .from("ai_chat_messages")
              .select("role, content")
              .eq("session_id", activeId)
              .order("created_at", { ascending: true });

            if (dbMsgs && dbMsgs.length > 0) {
              setMessages(
                dbMsgs.map((m) => ({
                  sender: m.role === "user" ? "user" : "coach",
                  text: m.content,
                }))
              );
            }
          } else {
            const { data: newSess } = await supabase
              .from("ai_chat_sessions")
              .insert([{ user_id: session.user.id, title: "Study Assistant Chat" }])
              .select("id")
              .single();
            if (newSess) setActiveSessionId(newSess.id);
          }
        } catch (err) {
          console.error("Failed to load chat history:", err);
        }

        // Fetch real DB tasks & study sessions to construct personalized advice
        const { data: userTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("status", "todo");

        const { data: userSessions } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", session.user.id);

        let tip = "";
        const uLang = prof.language || "en";

        if (uLang === "tr") {
          if (userTasks && userTasks.length > 0) {
            const highTask = userTasks.find((t) => t.priority === "high");
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
        } else {
          if (userTasks && userTasks.length > 0) {
            const highTask = userTasks.find((t) => t.priority === "high");
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

        // Show proactive bubble after 3.5 seconds
        setTimeout(() => {
          setProactiveMsg(tip);
          setShowBubble(true);
        }, 3500);
      }
    }

    loadData();
  }, []);

  // Check Google Calendar connection
  useEffect(() => {
    fetch("/api/calendar/list")
      .then((r) => r.json())
      .then((d) => setCalendarConnected(d.connected === true))
      .catch(() => setCalendarConnected(false));
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    const newMessages = [...messages, { sender: "user", text: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Save user message to persistent DB if session exists
      if (activeSessionId) {
        await supabase.from("ai_chat_messages").insert([
          { session_id: activeSessionId, role: "user", content: userText },
        ]);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      const data = await response.json();
      const reply = data.text || "I'm here to help you stay on pace with your studies!";

      setMessages((prev) => [...prev, { sender: "coach", text: reply }]);

      // Save assistant reply to persistent DB
      if (activeSessionId) {
        await supabase.from("ai_chat_messages").insert([
          { session_id: activeSessionId, role: "assistant", content: reply },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text: "I encountered a network issue. Please check your connection and try again.",
        },
      ]);
    }
    setLoading(false);
  };

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

      {/* Chat Panel Modal */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[520px] bg-white rounded-3xl shadow-2xl border border-gray-150 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-brand to-brand-dark text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold">OnPace AI Study Coach</h3>
                <p className="text-[10px] opacity-80">Online & ready to assist</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface-secondary/40">
            {messages.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
                <p>Start a conversation with your AI Study Coach!</p>
              </div>
            )}

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${
                  m.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.sender === "coach" && (
                  <div className="h-7 w-7 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={13} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-brand text-white rounded-br-none"
                      : "bg-white border border-gray-150 text-surface-dark rounded-bl-none shadow-2xs"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start items-center text-xs text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                <span>AI Coach is thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t border-gray-100 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.aiChat?.placeholderChat || "Ask anything about your studies..."}
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-brand text-white rounded-xl hover:bg-brand-hover active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
