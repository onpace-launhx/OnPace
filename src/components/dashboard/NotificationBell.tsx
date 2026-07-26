"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, CheckCheck, Trash2, X, Info, Megaphone, AlertCircle } from "lucide-react";
import { getTranslations } from "@/lib/translations";

const notificationCopy = {
  en: { label: "Notifications", unread: "new", clearAll: "Clear all", delete: "Delete notification" },
  tr: { label: "Bildirimler", unread: "yeni", clearAll: "Tümünü sil", delete: "Bildirimi sil" },
  es: { label: "Notificaciones", unread: "nuevas", clearAll: "Borrar todas", delete: "Eliminar notificación" },
  zh: { label: "通知", unread: "条新通知", clearAll: "清除全部", delete: "删除通知" },
} as const;

export function NotificationBell({ userLanguage }: { userLanguage?: string }) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const lang = userLanguage || "en";
  const t = getTranslations(lang);
  const ui = notificationCopy[["en", "tr", "es", "zh"].includes(lang) ? lang as keyof typeof notificationCopy : "en"];

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(
          data.filter((n: { read?: boolean }) => !n.read).length
        );
      }
    } catch {
      // Silently ignore notification fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
  };

  const handleDeleteNotification = async (id: string) => {
    const removed = notifications.find((notification) => notification.id === id);
    setNotifications((previous) => previous.filter((notification) => notification.id !== id));
    if (removed && !removed.read) setUnreadCount((previous) => Math.max(0, previous - 1));

    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      await fetchNotifications();
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Tüm bildirimleri silmek istediğinize emin misiniz?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const previous = notifications;
    setNotifications([]);
    setUnreadCount(0);
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (error) {
      setNotifications(previous);
      setUnreadCount(previous.filter((notification) => !notification.read).length);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-xl text-gray-500 hover:text-surface-dark hover:bg-gray-100/70 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
        aria-label={ui.label}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden text-surface-dark animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-surface-secondary border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-brand" />
                <span className="text-sm font-bold text-surface-dark">
                  {t.notifications?.title || "Bildirimler"}
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                    {unreadCount} yeni
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-brand hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckCheck size={12} />
                    {t.notifications?.markAllRead || "Tümünü okundu işaretle"}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] font-semibold text-red-500 hover:underline cursor-pointer flex items-center gap-1"
                    aria-label="Tüm bildirimleri sil"
                  >
                    <Trash2 size={12} /> Tümünü sil
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  <Bell size={24} className="mx-auto mb-2 opacity-30 text-gray-400" />
                  {t.notifications?.noNotifications || "Yeni bildirim bulunmuyor."}
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      !n.read ? "bg-brand/5 hover:bg-brand/10" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 text-brand">
                      {n.type === "announcement" ? (
                        <Megaphone size={15} />
                      ) : n.type === "alert" ? (
                        <AlertCircle size={15} className="text-amber-500" />
                      ) : (
                        <Info size={15} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-surface-dark truncate">
                          {n.title}
                        </p>
                        <span className="text-[9px] text-gray-400 shrink-0 ml-2">
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                        {n.content}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-brand shrink-0 mt-1.5" />
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteNotification(n.id);
                      }}
                      className="shrink-0 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      aria-label="Bildirimi sil"
                      title="Bildirimi sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
