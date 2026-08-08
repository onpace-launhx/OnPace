"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { MaintenanceScreen } from "@/components/dashboard/MaintenanceScreen";
import { createClient } from "@/lib/supabase/client";
import { X, Megaphone, Loader2, CheckCircle } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = createClient();
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Maintenance & Auth state
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [hasMaintenanceAccess, setHasMaintenanceAccess] = useState(false);
  const [userLang, setUserLang] = useState("en");
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [maintenanceContent, setMaintenanceContent] = useState<Record<string, any> | null>(null);

  // Announcement state
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<any[]>([]);
  const [dismissedPins, setDismissedPins] = useState<string[]>([]);
  const [popupAnn, setPopupAnn] = useState<any | null>(null);
  const [popupAnswers, setPopupAnswers] = useState<Record<string, string>>({});
  const [submittingPopup, setSubmittingPopup] = useState(false);
  const [popupSubmitted, setPopupSubmitted] = useState(false);

  const isFullscreenPage = pathname === "/onboarding";

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    async function checkMaintenanceAndUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc("refresh_my_subscription_access");
          void fetch("/api/billing/manage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync_my_campaign_access" }),
          });
          const { data: prof } = await supabase
            .from("profiles")
            .select("role, language, maintenance_access")
            .eq("id", user.id)
            .single();

          if (prof) {
            setUserLang(prof.language || "en");
            setIsAdminUser(["admin", "super_admin"].includes(prof.role));
            setHasMaintenanceAccess(prof.maintenance_access === true);
            const now = new Date();
            const localDate = [
              now.getFullYear(),
              String(now.getMonth() + 1).padStart(2, "0"),
              String(now.getDate()).padStart(2, "0"),
            ].join("-");
            void fetch("/api/daily-briefing", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date: localDate }),
            });
          }
        }

        const { data: settingsRows } = await supabase.rpc(
          "get_public_system_settings"
        );
        const settings = Array.isArray(settingsRows)
          ? settingsRows[0]
          : settingsRows;

        setIsMaintenanceMode(settings?.maintenance_mode === true);
        setMaintenanceContent(settings?.maintenance_content || null);
      } catch {
        // Silently ignore
      } finally {
        setMaintenanceChecked(true);
      }
    }

    async function loadAnnouncements() {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok) return;
        const data: any[] = await res.json();

        // Separate pinned vs popup
        const pinned = data.filter(
          (a) => a.display_type === "pin" && a.is_active
        );
        const popups = data.filter(
          (a) => a.display_type === "popup" && a.is_active
        );

        setPinnedAnnouncements(pinned);

        // Show popup only once per session (use sessionStorage)
        if (popups.length > 0) {
          const alreadySeen = sessionStorage.getItem("onpace_seen_popups") || "[]";
          const seenIds: string[] = JSON.parse(alreadySeen);
          const unseen = popups.find((p) => !seenIds.includes(p.id));
          if (unseen) {
            setPopupAnn(unseen);
          }
        }
      } catch {
        // Silently ignore - announcements are non-critical
      }
    }

    checkMaintenanceAndUser();
    const maintenanceInterval = window.setInterval(
      checkMaintenanceAndUser,
      30_000
    );
    if (!isFullscreenPage) {
      loadAnnouncements();
    }
    return () => window.clearInterval(maintenanceInterval);
  }, [isFullscreenPage, supabase]);

  const handleDismissPin = (id: string) => {
    setDismissedPins((prev) => [...prev, id]);
  };

  const handleClosePopup = () => {
    if (popupAnn) {
      const alreadySeen = sessionStorage.getItem("onpace_seen_popups") || "[]";
      const seenIds: string[] = JSON.parse(alreadySeen);
      sessionStorage.setItem(
        "onpace_seen_popups",
        JSON.stringify([...seenIds, popupAnn.id])
      );
    }
    setPopupAnn(null);
    setPopupAnswers({});
    setPopupSubmitted(false);
  };

  const handleSubmitPopup = async () => {
    if (!popupAnn) return;
    setSubmittingPopup(true);
    try {
      await fetch("/api/announcements/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcement_id: popupAnn.id,
          responses: popupAnswers,
        }),
      });
      setPopupSubmitted(true);
      setTimeout(() => handleClosePopup(), 2000);
    } catch {
      handleClosePopup();
    } finally {
      setSubmittingPopup(false);
    }
  };

  if (!maintenanceChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
        <Loader2 className="h-7 w-7 animate-spin text-brand" />
      </div>
    );
  }

  // If System Maintenance is active AND user is not an Admin -> Render Maintenance Barrier Screen
  if (isMaintenanceMode && !isAdminUser && !hasMaintenanceAccess) {
    return (
      <MaintenanceScreen
        userLanguage={userLang}
        content={maintenanceContent}
      />
    );
  }

  const visiblePins = pinnedAnnouncements.filter(
    (a) => !dismissedPins.includes(a.id)
  );
  const announcementCopy = {
    en: {
      dismissAnnouncement: "Dismiss announcement",
      feedbackSurvey: "Feedback survey",
      announcement: "Announcement",
      thanks: "Thank you for your response!",
      answer: "Your answer...",
      skip: "Skip",
      dismiss: "Dismiss",
      submit: "Submit response",
      gotIt: "Got it!",
      close: "Close",
    },
    tr: {
      dismissAnnouncement: "Duyuruyu kapat",
      feedbackSurvey: "Geri bildirim anketi",
      announcement: "Duyuru",
      thanks: "Yanıtınız için teşekkürler!",
      answer: "Yanıtınız...",
      skip: "Atla",
      dismiss: "Kapat",
      submit: "Yanıtı gönder",
      gotIt: "Anladım!",
      close: "Kapat",
    },
    es: {
      dismissAnnouncement: "Cerrar anuncio",
      feedbackSurvey: "Encuesta de comentarios",
      announcement: "Anuncio",
      thanks: "¡Gracias por tu respuesta!",
      answer: "Tu respuesta...",
      skip: "Omitir",
      dismiss: "Cerrar",
      submit: "Enviar respuesta",
      gotIt: "¡Entendido!",
      close: "Cerrar",
    },
    zh: {
      dismissAnnouncement: "关闭公告",
      feedbackSurvey: "反馈问卷",
      announcement: "公告",
      thanks: "感谢您的回复！",
      answer: "请输入您的回答...",
      skip: "跳过",
      dismiss: "关闭",
      submit: "提交回复",
      gotIt: "知道了！",
      close: "关闭",
    },
  }[userLang as "en" | "tr" | "es" | "zh"] || {
    dismissAnnouncement: "Dismiss announcement",
    feedbackSurvey: "Feedback survey",
    announcement: "Announcement",
    thanks: "Thank you for your response!",
    answer: "Your answer...",
    skip: "Skip",
    dismiss: "Dismiss",
    submit: "Submit response",
    gotIt: "Got it!",
    close: "Close",
  };

  if (isFullscreenPage) {
    return <div className="min-h-screen bg-surface-secondary">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary flex-col">
      {/* Pinned Announcement Banners */}
      {visiblePins.map((ann) => (
        <div
          key={ann.id}
          className="w-full bg-gradient-to-r from-brand to-brand-dark text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-40 shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone size={14} className="shrink-0 opacity-90" />
            <span className="font-bold mr-1 shrink-0">{ann.title}:</span>
            <span className="opacity-90 truncate">{ann.content}</span>
          </div>
          <button
            onClick={() => handleDismissPin(ann.id)}
            className="shrink-0 p-1 hover:bg-white/20 rounded-lg transition-all cursor-pointer active:scale-95"
            aria-label={announcementCopy.dismissAnnouncement}
          >
            <X size={13} />
          </button>
        </div>
      ))}

      {/* Main content row */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <div ref={contentScrollRef} className="relative h-full min-w-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Global Topbar Notification Bell */}
          <div className="absolute top-4 right-6 z-30 pointer-events-auto">
            <NotificationBell userLanguage={userLang} />
          </div>
          <div className="h-16 shrink-0 lg:hidden" aria-hidden="true" />
          {children}
        </div>
      </div>

      {/* Popup Announcement/Feedback Modal */}
      {popupAnn && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand to-brand-dark p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} />
                  <span className="text-xs font-extrabold uppercase tracking-wider opacity-80">
                    {popupAnn.type === "feedback" ? "📋 " + announcementCopy.feedbackSurvey : "📢 " + announcementCopy.announcement}
                  </span>
                </div>
                <button
                  onClick={handleClosePopup}
                  className="p-1 hover:bg-white/20 rounded-lg transition-all cursor-pointer"
                  aria-label={announcementCopy.close}
                >
                  <X size={15} />
                </button>
              </div>
              <h3 className="text-base font-bold mt-2">{popupAnn.title}</h3>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {popupSubmitted ? (
                <div className="text-center py-4 space-y-3">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <p className="text-sm font-bold text-green-700">{announcementCopy.thanks}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-600 leading-relaxed">{popupAnn.content}</p>

                  {/* Feedback questions */}
                  {popupAnn.type === "feedback" && popupAnn.questions && popupAnn.questions.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {popupAnn.questions.map((q: any, idx: number) => (
                        <div key={q.id || idx}>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">
                            {idx + 1}. {q.question}
                          </label>
                          <textarea
                            rows={2}
                            value={popupAnswers[q.id || idx] || ""}
                            onChange={(e) =>
                              setPopupAnswers((prev) => ({
                                ...prev,
                                [q.id || idx]: e.target.value,
                              }))
                            }
                            placeholder={announcementCopy.answer}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand resize-none text-gray-900 bg-white placeholder-gray-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleClosePopup}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      {popupAnn.type === "feedback" ? announcementCopy.skip : announcementCopy.dismiss}
                    </button>
                    {popupAnn.type === "feedback" ? (
                      <button
                        onClick={handleSubmitPopup}
                        disabled={submittingPopup}
                        className="flex-1 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        {submittingPopup ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          announcementCopy.submit
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleClosePopup}
                        className="flex-1 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover cursor-pointer transition-all active:scale-95"
                      >
                        {announcementCopy.gotIt}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
