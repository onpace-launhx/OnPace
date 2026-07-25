"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const PROACTIVE_TIPS = [
  "💡 Don't forget to review your flashcards today!",
  "📅 Want me to schedule your next study session on Google Calendar?",
  "🎯 You're on a streak! Keep it going.",
  "📖 Need help breaking down a complex topic?",
  "⏱️ A 25-min Pomodoro session can boost focus. Want to start one?",
];

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hey! I'm your OnPace AI Coach. I can help you study, manage tasks, and even control your Google Calendar. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check calendar connection status
  useEffect(() => {
    fetch("/api/calendar/list")
      .then((r) => r.json())
      .then((d) => setCalendarConnected(d.connected === true))
      .catch(() => setCalendarConnected(false));
  }, []);

  // Check URL params for calendar connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      setCalendarConnected(true);
      setOpen(true);
      addAssistantMessage(
        "Google Calendar successfully connected! I can now view, add, and delete your calendar events. Try asking me: 'Show my upcoming events' or 'Schedule a study session for tomorrow at 5pm'."
      );
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("calendar_error")) {
      setOpen(true);
      addAssistantMessage(
        "There was a problem connecting your Google Calendar. Please try again using the 'Connect Google Calendar' button."
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Proactive tip bubble every 2 minutes when widget is closed
  useEffect(() => {
    if (open) return;
    const interval = setInterval(() => {
      const tip = PROACTIVE_TIPS[Math.floor(Math.random() * PROACTIVE_TIPS.length)];
      setCurrentTip(tip);
      setTipVisible(true);
      setTimeout(() => setTipVisible(false), 5000);
    }, 120000); // every 2 minutes

    // Show first tip after 30s
    const initial = setTimeout(() => {
      const tip = PROACTIVE_TIPS[0];
      setCurrentTip(tip);
      setTipVisible(true);
      setTimeout(() => setTipVisible(false), 5000);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  function addAssistantMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        text,
        timestamp: new Date(),
      },
    ]);
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        sender: m.role === "user" ? "user" : "assistant",
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI assistant is unavailable.");
      }
      const reply = data.reply;
      if (!reply) throw new Error("AI returned an empty response.");

      addAssistantMessage(reply);
    } catch (error) {
      addAssistantMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Proactive tip bubble */}
      <div
        style={{
          position: "fixed",
          bottom: "100px",
          right: "24px",
          zIndex: 10000,
          maxWidth: "260px",
          background: "rgba(79,70,229,0.95)",
          backdropFilter: "blur(12px)",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "14px 14px 4px 14px",
          fontSize: "13px",
          lineHeight: "1.4",
          boxShadow: "0 8px 32px rgba(79,70,229,0.35)",
          opacity: tipVisible && !open ? 1 : 0,
          transform: tipVisible && !open ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          pointerEvents: tipVisible && !open ? "auto" : "none",
          cursor: "pointer",
        }}
        onClick={() => { setTipVisible(false); setOpen(true); }}
      >
        {currentTip}
      </div>

      {/* Chat panel */}
      <div
        style={{
          position: "fixed",
          bottom: "90px",
          right: "24px",
          width: "380px",
          maxWidth: "calc(100vw - 48px)",
          height: "560px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          borderRadius: "20px",
          overflow: "hidden",
          background: "rgba(15, 15, 30, 0.92)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,70,229,0.3)",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(79,70,229,0.9), rgba(139,92,246,0.9))",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
          >
            🎓
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>
              OnPace AI Coach
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "11px" }}>
              {loading ? "Thinking…" : "Online · Ready to help"}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
          >
            ✕
          </button>
        </div>

        {/* Calendar connection banner */}
        {calendarConnected === false && (
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(245,158,11,0.15)",
              borderBottom: "1px solid rgba(245,158,11,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "14px" }}>📅</span>
            <span style={{ color: "#fbbf24", fontSize: "12px", flex: 1 }}>
              Connect Google Calendar for full AI access
            </span>
            <a
              href="/api/google/oauth"
              style={{
                background: "rgba(245,158,11,0.3)",
                border: "1px solid rgba(245,158,11,0.5)",
                color: "#fbbf24",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                textDecoration: "none",
                fontWeight: 600,
                whiteSpace: "nowrap",
                transition: "background 0.2s",
              }}
            >
              Connect
            </a>
          </div>
        )}

        {calendarConnected === true && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(34,197,94,0.12)",
              borderBottom: "1px solid rgba(34,197,94,0.2)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "12px" }}>✅</span>
            <span style={{ color: "#4ade80", fontSize: "11px" }}>
              Google Calendar connected · AI can manage your events
            </span>
          </div>
        )}

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.1) transparent",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: "4px",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius:
                    msg.role === "user"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                      : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  boxShadow:
                    msg.role === "user"
                      ? "0 4px 12px rgba(79,70,229,0.35)"
                      : "none",
                  border:
                    msg.role === "assistant"
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.text.replace(/#{1,6}\s/g, "").replace(/\*\*/g, "")}
              </div>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  gap: "5px",
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.5)",
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick actions */}
        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          {["Show my tasks", "My schedule today", "Add study session"].map((q) => (
            <button
              key={q}
              onClick={() => { setInput(q); setTimeout(sendMessage, 50); }}
              style={{
                background: "rgba(79,70,229,0.2)",
                border: "1px solid rgba(79,70,229,0.4)",
                color: "rgba(255,255,255,0.8)",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "11px",
                cursor: "pointer",
                transition: "background 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "10px",
            alignItems: "flex-end",
            flexShrink: 0,
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything… (Enter to send)"
            rows={1}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              color: "#fff",
              padding: "10px 14px",
              fontSize: "13px",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: "1.4",
              maxHeight: "80px",
              overflowY: "auto",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background:
                input.trim() && !loading
                  ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                  : "rgba(255,255,255,0.08)",
              border: "none",
              color: "#fff",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s, transform 0.1s",
              transform: input.trim() && !loading ? "scale(1)" : "scale(0.95)",
            }}
          >
            ➤
          </button>
        </div>
      </div>

      {/* Floating button */}
      <button
        onClick={() => { setOpen((v) => !v); setTipVisible(false); }}
        aria-label="Open AI Coach"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: open
            ? "rgba(79,70,229,0.5)"
            : "linear-gradient(135deg, #4f46e5, #7c3aed)",
          border: "none",
          cursor: "pointer",
          zIndex: 10000,
          boxShadow: "0 8px 32px rgba(79,70,229,0.5), 0 2px 8px rgba(0,0,0,0.3)",
          fontSize: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          backdropFilter: "blur(12px)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {open ? "✕" : "🎓"}
      </button>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
