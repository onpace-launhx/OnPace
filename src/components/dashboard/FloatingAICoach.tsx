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
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Load Profile & Setup Proactive Tips
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (prof) {
        setProfile(prof);

        // Fetch last persistent conversation session
        try {
          const { data: conversations } = await supabase
            .from("ai_chat_conversations")
            .select("id")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (conversations && conversations.length > 0) {
            const activeId = conversations[0].id;
            setActiveConversationId(activeId);

            const { data: dbMsgs } = await supabase
              .from("ai_chat_messages")
              .select("role, content")
              .eq("conversation_id", activeId)
              .order("created_at", { ascending: true });

            if (dbMsgs && dbMsgs.length > 0) {
              setMessages(dbMsgs.map(m => ({
                sender: m.role === "user" ? "user" : "coach",
                text: m.content
              })));
            }
          }
        } catch (err) {
          console.error("Failed to load persistent conversation history:", err);
        }

        // Fetch tasks to construct a smart proactive message
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("status", "todo");

        // Fetch calendar sessions
        const { data: sessions } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", session.user.id);

        // Choose proactive tip contextually
        let tip = "";
        if (prof.language === "tr") {
          if (tasks && tasks.length > 0) {
            const highTask = tasks.find(t => t.priority === "high");
            if (highTask) {
              tip = `Yapılacak önemli bir görevin var: "${highTask.title}". Bitirmeyi unutma! 🎯`;
            } else {
              tip = `Bugün yapılacak ${tasks.length} görev gözüküyor. Hepsini tamamlayalım! 💪`;
            }
          } else {
            tip = "Bugün için aktif görevin yok. Çalışma planı oluşturmak ister misin? 🧠";
          }
          if (sessions && sessions.length > 0) {
            tip += ` Ayrıca takviminde ${sessions.length} ders oturumu planlanmış!`;
          }
        } else {
          if (tasks && tasks.length > 0) {
            const highTask = tasks.find(t => t.priority === "high");
            if (highTask) {
              tip = `You have a high-priority task: "${highTask.title}". Let's finish it! 🎯`;
            } else {
              tip = `You have ${tasks.length} study tasks active. Let's stay on pace! 💪`;
            }
          } else {
            tip = "Your task list is empty. Need to generate a study schedule? 🧠";
          }
          if (sessions && sessions.length > 0) {
            tip += ` Plus, you have ${sessions.length} calendar sessions scheduled!`;
          }
        }

        // Show proactive bubble after 4 seconds
        setTimeout(() => {
          setProactiveMsg(tip);
          setShowBubble(true);
        }, 4000);
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

  // Handle OAuth callback URL params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      setCalendarConnected(true);
      setIsOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text: lang === "tr"
            ? "Google Takvim başarıyla bağlandı! Artık takvimindeki etkinlikleri görüntüleyebilir, ekleyebilir ve silebilirim. Dene: 'Yaklaşan etkinliklerimi göster'"
            : "Google Calendar successfully connected! I can now view, add, and delete your calendar events. Try: 'Show my upcoming events'",
        },
      ]);
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("calendar_error")) {
      setIsOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text: lang === "tr"
            ? "Google Takvim bağlanırken bir hata oluştu. Lütfen tekrar deneyin."
            : "There was a problem connecting your Google Calendar. Please try again.",
        },
      ]);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [lang]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg = { sender: "user", text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setShowBubble(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        let convId = activeConversationId;
        if (!convId) {
          const { data: newConv } = await supabase
            .from("ai_chat_conversations")
            .insert({ user_id: session.user.id, title: "Chat Session" })
            .select("id")
            .single();
          if (newConv) {
            convId = newConv.id;
            setActiveConversationId(convId);
          }
        }

        if (convId) {
          await supabase.from("ai_chat_messages").insert({
            conversation_id: convId,
            user_id: session.user.id,
            role: "user",
            content: userText
          });
        }

        const chatHistory = messages.map(m => ({
          sender: m.sender,
          text: m.text
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            history: chatHistory
          })
        });

        const data = await res.json();
        if (res.ok && data.reply) {
          setMessages(prev => [...prev, { sender: "coach", text: data.reply }]);
          
          if (convId) {
            await supabase.from("ai_chat_messages").insert({
              conversation_id: convId,
              user_id: session.user.id,
              role: "assistant",
              content: data.reply
            });
          }
        } else {
          setMessages(prev => [...prev, { sender: "coach", text: data.error || "An error occurred." }]);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: "coach", text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBubbleClick = () => {
    setShowBubble(false);
    setIsOpen(true);
    if (proactiveMsg) {
      setMessages(prev => [
        ...prev,
        { sender: "coach", text: proactiveMsg }
      ]);
    }
  };

  if (!profile) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3.5 font-sans">
      {/* Proactive Tip Notification Bubble */}
      {showBubble && proactiveMsg && (
        <div 
          onClick={handleBubbleClick}
          className="max-w-[260px] bg-white border border-brand/15 shadow-lg p-3 rounded-2xl cursor-pointer hover:border-brand/30 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-300 relative"
        >
          {/* Close button – large and clearly visible */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowBubble(false);
            }} 
            className="absolute -top-2 -right-2 bg-gray-800 hover:bg-gray-900 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors shadow-sm z-10"
            title="Dismiss"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
          <div className="flex gap-2 items-start pr-1">
            <span className="p-1 bg-brand/10 rounded-lg text-brand shrink-0 mt-0.5">
              <Sparkles size={11} fill="currentColor" />
            </span>
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] font-bold uppercase tracking-wider text-brand/70">AI Coach</span>
              <p className="text-[11px] text-gray-600 leading-snug">{proactiveMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Expanded Chat Container */}
      {isOpen ? (
        <div className="w-[360px] h-[480px] bg-white border border-gray-150 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* Header Bar */}
          <div className="bg-brand px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl text-white">
                <Sparkles size={16} fill="white" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-white">AI Study Coach</h3>
                <span className="text-[10px] font-bold text-brand-light opacity-90">
                  {lang === "tr" ? "Çalışma Asistanı (Takvim Yetkili)" : "Study Assistant (Calendar & Task Enabled)"}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Google Calendar Banner */}
          {calendarConnected === false && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100">
              <span className="text-base">📅</span>
              <span className="text-[10px] font-semibold text-amber-700 flex-1">
                {lang === "tr" ? "Google Takvim bağlı değil" : "Google Calendar not connected"}
              </span>
              <a
                href="/api/google/oauth"
                className="text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-1 rounded-lg transition-colors"
              >
                {lang === "tr" ? "Bağla" : "Connect"}
              </a>
            </div>
          )}
          {calendarConnected === true && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-100">
              <span className="text-base">✅</span>
              <span className="text-[10px] font-semibold text-green-700">
                {lang === "tr" ? "Google Takvim bağlı · AI etkinliklerinizi yönetebilir" : "Google Calendar connected · AI can manage your events"}
              </span>
            </div>
          )}

          {/* Messages Body Scroll Pane */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gray-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="p-3 bg-brand/5 rounded-2xl text-brand animate-pulse">
                  <Sparkles size={24} fill="currentColor" />
                </div>
                <p className="text-xs font-extrabold text-surface-dark">
                  {lang === "tr" ? "Merhaba! Ben Yapay Zeka Koçunuz" : "Hello! I am your AI Study Coach"}
                </p>
                <p className="text-[10px] text-gray-400 font-semibold max-w-[200px]">
                  {lang === "tr" ? "Takviminize erişebilir, yeni görevler ekleyebilir ve plan oluşturabilirim." : "I can manage your tasks, schedules, and read/update your study calendar."}
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs font-semibold leading-relaxed ${
                    m.sender === "user" 
                      ? "bg-brand text-white rounded-br-none" 
                      : "bg-white text-gray-700 border border-gray-150 rounded-bl-none shadow-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 border border-gray-150 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5 text-xs font-semibold">
                  <Loader2 size={12} className="animate-spin text-brand" />
                  {lang === "tr" ? "Düşünüyor..." : "Thinking..."}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Form Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "tr" ? "Takvime ders ekle..." : "Schedule study tomorrow at 3pm..."}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark font-medium"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-brand text-white rounded-xl hover:bg-brand-hover active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      ) : (
        /* Floating Button Widget */
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-brand hover:bg-brand-hover shadow-2xl flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer group hover:rotate-12 border-2 border-white/20"
        >
          <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform" fill="white" />
        </button>
      )}
    </div>
  );
}
