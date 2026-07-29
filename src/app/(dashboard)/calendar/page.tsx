"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar as CalendarIcon,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Globe,
  Settings,
  HelpCircle,
  FileText,
  Lock,
  Upload,
  Camera,
  Check,
  MessageSquare,
  Trash2,
  X,
  RefreshCw
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { getLocalizedCourseName } from "@/lib/course-labels";

type DuplicateConflict = {
  incomingKey: string;
  existingId: string;
  existingType: "session" | "task" | "incoming";
  existingTitle: string;
  reason: string;
  confidence: number;
};

type CalendarInsertBatch = {
  sessions: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  source: string;
  closeAfter: "session" | "ocr" | "day-plan" | "ai-plan";
};

type ExistingDuplicatePair = {
  duplicateId: string;
  canonicalId: string;
  type: "session" | "task";
  title: string;
  canonicalTitle: string;
  reason: string;
};

type CalendarTimeConflict = {
  sessionIndex: number;
  title: string;
  startTime: string;
  endTime: string;
  alternativeStart: string | null;
  alternativeEnd: string | null;
  conflictingSessions: Array<{ title: string; startTime: string; endTime: string }>;
};

function getSessionEndTime(session: Record<string, any>) {
  if (typeof session.end_time === "string") return new Date(session.end_time);
  return new Date(
    new Date(String(session.start_time)).getTime() +
      Math.max(15, Number(session.duration) || 60) * 60_000
  );
}

function findNextAvailableStart(
  startTime: string,
  durationMinutes: number,
  sessions: Array<Record<string, any>>
) {
  let candidate = new Date(startTime);
  const durationMs = durationMinutes * 60_000;

  for (let attempt = 0; attempt < 96; attempt += 1) {
    const candidateEnd = new Date(candidate.getTime() + durationMs);
    const conflicts = sessions.filter((session) => {
      const sessionStart = new Date(String(session.start_time));
      const sessionEnd = getSessionEndTime(session);
      return sessionStart < candidateEnd && sessionEnd > candidate;
    });
    if (conflicts.length === 0) return candidate.toISOString();
    candidate = new Date(
      Math.ceil(
        Math.max(...conflicts.map((session) => getSessionEndTime(session).getTime())) /
          900_000
      ) * 900_000
    );
  }

  return null;
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [studySessions, setStudySessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Google Calendar Integration States
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [lastCalendarSyncAt, setLastCalendarSyncAt] = useState<string | null>(null);
  const calendarSyncLock = useRef(false);

  // Session Modal State
  const [sessionOpen, setSessionOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("14:00");
  const [duration, setDuration] = useState("60");
  const [isSyncing, setIsSyncing] = useState(false);

  // AI Planner States
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [proposedSessions, setProposedSessions] = useState<any[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  // Custom Alert Popups
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  // Edit / Details Modal States
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editDateStr, setEditDateStr] = useState("");
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editDuration, setEditDuration] = useState("60");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [duplicateReview, setDuplicateReview] = useState<{
    batch: CalendarInsertBatch;
    conflicts: DuplicateConflict[];
  } | null>(null);
  const [duplicateSeparateKeys, setDuplicateSeparateKeys] = useState<string[]>([]);
  const [committingBatch, setCommittingBatch] = useState(false);
  const [existingDuplicateReview, setExistingDuplicateReview] = useState<ExistingDuplicatePair[] | null>(null);
  const [existingDuplicateKeepSeparate, setExistingDuplicateKeepSeparate] = useState<string[]>([]);
  const [mergingExistingDuplicates, setMergingExistingDuplicates] = useState(false);
  const [timeConflictReview, setTimeConflictReview] = useState<{
    batch: CalendarInsertBatch;
    conflicts: CalendarTimeConflict[];
  } | null>(null);

  // ── Vision OCR Schedule Upload States ──────────────────────────────────────
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreviewEvents, setOcrPreviewEvents] = useState<any[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // ── Plan My Day Interactive AI States ─────────────────────────────────────
  const [planMyDayOpen, setPlanMyDayOpen] = useState(false);
  const [isPlanningDay, setIsPlanningDay] = useState(false);
  const [dayPlanBlocks, setDayPlanBlocks] = useState<any[]>([]);
  const [dayPlanNote, setDayPlanNote] = useState("");
  const autoPlanHandled = useRef(false);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);
  const calendarCopy = {
    en: {
      ocrDescription: "Upload a screenshot of your schedule, to-do list, or calendar. AI will extract the items for your review before adding them.",
      chooseImage: "Choose an image or drop it here",
      supported: "PNG, JPG, and WEBP are supported",
      reading: "AI is reading the image and extracting items...",
      found: "Items found",
      addItems: "Add items to calendar",
      analyzing: "Analyzing today's tasks...",
      cancel: "Cancel",
      confirmPlan: "Use this plan for my day",
      today: "Today",
      minutes: "mins",
      invalidImage: "Choose a PNG, JPG, or WEBP image smaller than 6 MB.",
      noEvents: "No reliable items were found in this image.",
      readError: "The image could not be read.",
      reviewHint: "Review and edit every title, time, and duration before adding anything.",
      titleLabel: "Title",
      startLabel: "Start",
      durationLabel: "Duration",
      typeSession: "Calendar session",
      typeTask: "Task",
      remove: "Remove",
      sessionsShort: "sessions",
      deleteEvent: "Delete event",
    },
    tr: {
      ocrDescription: "Ders programınızın, yapılacaklar listenizin veya takviminizin ekran görüntüsünü yükleyin. AI öğeleri çıkarır; takvime eklemeden önce siz onaylarsınız.",
      chooseImage: "Görsel seçin veya buraya sürükleyin",
      supported: "PNG, JPG ve WEBP desteklenir",
      reading: "AI görseli okuyor ve öğeleri çıkarıyor...",
      found: "Bulunan öğeler",
      addItems: "Öğeleri takvime ekle",
      analyzing: "Bugünkü görevleriniz analiz ediliyor...",
      cancel: "Vazgeç",
      confirmPlan: "Günümü bu plana göre oluştur",
      today: "Bugün",
      minutes: "dk",
      invalidImage: "6 MB’tan küçük PNG, JPG veya WEBP görseli seç.",
      noEvents: "Bu görselde güvenilir bir öğe bulunamadı.",
      readError: "Görsel okunamadı.",
      reviewHint: "Eklemeden önce her başlığı, saati ve süreyi kontrol edip düzenle.",
      titleLabel: "Başlık",
      startLabel: "Başlangıç",
      durationLabel: "Süre",
      typeSession: "Takvim oturumu",
      typeTask: "Görev",
      remove: "Kaldır",
      sessionsShort: "oturum",
      deleteEvent: "Etkinliği sil",
    },
    es: {
      ocrDescription: "Sube una captura de tu horario, lista de tareas o calendario. La IA extraerá los elementos para que los revises antes de añadirlos.",
      chooseImage: "Elige una imagen o arrástrala aquí",
      supported: "Compatible con PNG, JPG y WEBP",
      reading: "La IA está leyendo la imagen y extrayendo elementos...",
      found: "Elementos encontrados",
      addItems: "Añadir elementos al calendario",
      analyzing: "Analizando las tareas de hoy...",
      cancel: "Cancelar",
      confirmPlan: "Usar este plan para mi día",
      today: "Hoy",
      minutes: "min",
      invalidImage: "Elige una imagen PNG, JPG o WEBP de menos de 6 MB.",
      noEvents: "No se encontraron elementos fiables en esta imagen.",
      readError: "No se pudo leer la imagen.",
      reviewHint: "Revisa y edita cada título, hora y duración antes de añadir elementos.",
      titleLabel: "Título",
      startLabel: "Inicio",
      durationLabel: "Duración",
      typeSession: "Sesión de calendario",
      typeTask: "Tarea",
      remove: "Eliminar",
      sessionsShort: "sesiones",
      deleteEvent: "Eliminar evento",
    },
    zh: {
      ocrDescription: "上传课程表、待办事项或日历截图。AI 会提取内容，并在添加到日历前供您确认。",
      chooseImage: "选择图片或拖放到此处",
      supported: "支持 PNG、JPG 和 WEBP",
      reading: "AI 正在读取图片并提取内容...",
      found: "找到的项目",
      addItems: "将项目添加到日历",
      analyzing: "正在分析今天的任务...",
      cancel: "取消",
      confirmPlan: "按此方案规划今天",
      today: "今天",
      minutes: "分钟",
      invalidImage: "请选择小于 6 MB 的 PNG、JPG 或 WEBP 图片。",
      noEvents: "图片中未找到可靠项目。",
      readError: "无法读取图片。",
      reviewHint: "添加前请检查并编辑每个标题、时间和时长。",
      titleLabel: "标题",
      startLabel: "开始时间",
      durationLabel: "时长",
      typeSession: "日历学习安排",
      typeTask: "任务",
      remove: "移除",
      sessionsShort: "项安排",
      deleteEvent: "删除日历安排",
    },
  }[lang as "en" | "tr" | "es" | "zh"] || {
    ocrDescription: "Upload a screenshot of your schedule, to-do list, or calendar. AI will extract the items for your review before adding them.",
    chooseImage: "Choose an image or drop it here",
    supported: "PNG, JPG, and WEBP are supported",
    reading: "AI is reading the image and extracting items...",
    found: "Items found",
    addItems: "Add items to calendar",
    analyzing: "Analyzing today's tasks...",
    cancel: "Cancel",
    confirmPlan: "Use this plan for my day",
    today: "Today",
    minutes: "mins",
    invalidImage: "Choose a PNG, JPG, or WEBP image smaller than 6 MB.",
    noEvents: "No reliable items were found in this image.",
    readError: "The image could not be read.",
    reviewHint: "Review and edit every title, time, and duration before adding anything.",
    titleLabel: "Title",
    startLabel: "Start",
    durationLabel: "Duration",
    typeSession: "Calendar session",
    typeTask: "Task",
    remove: "Remove",
    sessionsShort: "sessions",
    deleteEvent: "Delete event",
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadAllData = async (skipGoogleSync = false) => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(profileData);

    // Query user_google_tokens table for real Google Calendar connection state
    const { data: googleToken } = await supabase
      .from("user_google_tokens")
      .select("id, scope")
      .eq("user_id", user.id)
      .maybeSingle();

    const isGConnected = Boolean(
      googleToken?.scope?.includes("https://www.googleapis.com/auth/calendar")
    );
    const gEmail = isGConnected ? (user.email || "Google Connected") : "";
    setGoogleConnected(isGConnected);
    setGoogleEmail(gEmail);

    const { data: coursesData } = await supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id);
    if (coursesData) setCourses(coursesData);

    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*, courses(name, color)")
      .eq("user_id", user.id);
    if (tasksData) setTasks(tasksData);

    // Reconcile Google and OnPace first, then render the canonical local rows.
    // Every synced row keeps its Google event id, so edits and deletes affect
    // the same event instead of creating a second, synthetic calendar item.
    if (isGConnected && !skipGoogleSync) {
      try {
        setCalendarSyncing(true);
        const response = await fetch("/api/calendar/sync", { method: "POST" });
        const syncResult = await response.json().catch(() => ({}));
        if (!response.ok || !syncResult.success) {
          throw new Error(syncResult.error || "Google Calendar synchronization failed.");
        }
        setLastCalendarSyncAt(syncResult.lastSyncAt || new Date().toISOString());
      } catch (err) {
        console.error("Failed to synchronize Google Calendar:", err);
        setCustomAlert(err instanceof Error ? err.message : "Google Calendar synchronization failed.");
      } finally {
        setCalendarSyncing(false);
      }
    }

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("*, courses(name, color)")
      .eq("user_id", user.id);
    if (sessionsError) {
      setCustomAlert(sessionsError.message);
    }
    setStudySessions((sessionsData || []).map((session) => ({
      ...session,
      isGoogleEvent: Boolean(session.google_event_id),
    })));
    setLoading(false);

    // Avoid repeatedly interrupting the same browser session after dismissal.
    const promptDismissed =
      sessionStorage.getItem("onpace_google_calendar_prompt_dismissed") ===
      "true";
    if (!isGConnected && !promptDismissed) {
      setShowLinkPrompt(true);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [router, supabase]);

  const openSessionDetails = (session: any) => {
    const start = session.start_time ? new Date(session.start_time) : new Date();
    setSelectedSession(session);
    setEditTitle(String(session.title || ""));
    setEditCourseId(session.course_id || "");
    setEditDateStr(
      [start.getFullYear(), String(start.getMonth() + 1).padStart(2, "0"), String(start.getDate()).padStart(2, "0")].join("-")
    );
    setEditStartTime(
      `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
    );
    setEditDuration(String(session.duration || 60));
  };

  const closeSessionDetails = () => {
    if (!savingEdit && !deletingSession) setSelectedSession(null);
  };

  const handleSaveSessionEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSession || !editTitle.trim()) return;

    const durationMinutes = Math.max(15, Number(editDuration) || 60);
    const startTimeIso = new Date(`${editDateStr}T${editStartTime}:00`).toISOString();
    setSavingEdit(true);

    try {
      const { data, error } = await supabase
        .from("study_sessions")
        .update({
          title: editTitle.trim(),
          course_id: editCourseId || null,
          start_time: startTimeIso,
          end_time: new Date(
            new Date(startTimeIso).getTime() + durationMinutes * 60_000
          ).toISOString(),
          duration: durationMinutes,
          sync_status: selectedSession.google_event_id ? "pending_update" : "local_only",
          sync_error: null,
        })
        .eq("id", selectedSession.id)
        .select("*, courses(name, color)")
        .single();
      if (error) throw new Error(error.message);

      setStudySessions((current) => current.map((session) =>
        session.id === selectedSession.id
          ? { ...data, isGoogleEvent: Boolean(data.google_event_id) }
          : session
      ));

      if (googleConnected) {
        const response = await fetch("/api/calendar/sync", { method: "POST" });
        const syncResult = await response.json().catch(() => ({}));
        if (!response.ok || !syncResult.success) {
          throw new Error(syncResult.error || "Saved in OnPace, but Google Calendar could not be updated.");
        }
        setLastCalendarSyncAt(syncResult.lastSyncAt || new Date().toISOString());
      }
      setSelectedSession(null);
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : "Calendar event could not be updated.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    setDeletingSession(true);
    try {
      if (googleConnected) {
        const response = await fetch("/api/calendar/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ localSessionId: selectedSession.id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || "Google Calendar event could not be deleted.");
      } else {
        if (selectedSession.google_event_id) {
          const { error: tombstoneError } = await supabase
            .from("calendar_sync_tombstones")
            .upsert({
              user_id: selectedSession.user_id,
              calendar_id: selectedSession.google_calendar_id || "primary",
              google_event_id: selectedSession.google_event_id,
            }, {
              onConflict: "user_id,calendar_id,google_event_id",
            });
          if (tombstoneError) throw new Error(tombstoneError.message);
        }
        const { error } = await supabase.from("study_sessions").delete().eq("id", selectedSession.id);
        if (error) throw new Error(error.message);
      }
      setStudySessions((current) => current.filter((session) => session.id !== selectedSession.id));
      setSelectedSession(null);
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : "Calendar event could not be deleted.");
    } finally {
      setDeletingSession(false);
    }
  };

  const handleExportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//OnPace//Study Calendar//EN\n";
    studySessions.forEach(s => {
      const dt = new Date(s.start_time);
      const dtStr = dt.toISOString().replace(/-|:|\.\d\d\d/g, "");
      icsContent += `BEGIN:VEVENT\nSUMMARY:${s.title}\nDTSTART:${dtStr}\nDURATION:PT${s.duration || 60}M\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "onpace_study_calendar.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const syncSessionsToGoogle = async (
    sessions: Array<{ title: string; start_time: string; duration: number }>,
    _description: string
  ) => {
    if (!googleConnected || sessions.length === 0) return true;
    try {
      setCalendarSyncing(true);
      const response = await fetch("/api/calendar/sync", { method: "POST" });
      const syncResult = await response.json().catch(() => ({}));
      if (!response.ok || !syncResult.success) {
        throw new Error(syncResult.error || "Google Calendar synchronization failed.");
      }
      setLastCalendarSyncAt(syncResult.lastSyncAt || new Date().toISOString());
      return true;
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : "Google Calendar could not be reached. Please try again.");
      return false;
    } finally {
      setCalendarSyncing(false);
    }
  };

  const closeBatchSource = (source: CalendarInsertBatch["closeAfter"]) => {
    if (source === "session") {
      setSessionOpen(false);
      setTitle("");
      setCourseId("");
    } else if (source === "ocr") {
      setOcrModalOpen(false);
      setOcrPreviewEvents([]);
    } else if (source === "day-plan") {
      setPlanMyDayOpen(false);
    } else if (source === "ai-plan") {
      setAiPlannerOpen(false);
    }
  };

  const commitCalendarBatch = async (
    batch: CalendarInsertBatch,
    conflicts: DuplicateConflict[] = [],
    addSeparately: string[] = []
  ) => {
    setCommittingBatch(true);
    const duplicateKeys = new Set(conflicts.map((item) => item.incomingKey));
    const separateKeys = new Set(addSeparately);
    const sessionsToInsert = batch.sessions.filter((_, index) => {
      const key = `session:${index}`;
      return !duplicateKeys.has(key) || separateKeys.has(key);
    });
    const tasksToInsert = batch.tasks.filter((_, index) => {
      const key = `task:${index}`;
      return !duplicateKeys.has(key) || separateKeys.has(key);
    });

    try {
      let addedSessions: any[] = [];
      const normalizedSessions = sessionsToInsert.map((session) => {
        const startTime = String(session.start_time || "");
        const durationMinutes = Math.min(
          1_440,
          Math.max(15, Number(session.duration) || 60)
        );
        return {
          ...session,
          duration: durationMinutes,
          end_time:
            typeof session.end_time === "string" && session.end_time
              ? session.end_time
              : new Date(
                  new Date(startTime).getTime() + durationMinutes * 60_000
                ).toISOString(),
          is_ai_scheduled:
            Boolean(session.is_ai_scheduled) || batch.source.includes("AI"),
        };
      });

      if (normalizedSessions.length > 0) {
        const { data, error } = await supabase
          .from("study_sessions")
          .insert(normalizedSessions)
          .select("*, courses(name, color)");
        if (error) throw new Error(error.message);
        addedSessions = data || [];
        setStudySessions((current) => [
          ...current,
          ...addedSessions.map((session) => ({
            ...session,
            isGoogleEvent: Boolean(session.google_event_id),
          })),
        ]);
        const firstStart = addedSessions[0]?.start_time;
        if (firstStart) setCurrentDate(new Date(firstStart));
      }

      if (tasksToInsert.length > 0) {
        const { data, error } = await supabase
          .from("tasks")
          .insert(tasksToInsert)
          .select("*, courses(name, color)");
        if (error) throw new Error(error.message);
        if (data) setTasks((current) => [...current, ...data]);
      }

      closeBatchSource(batch.closeAfter);
      setDuplicateReview(null);
      setDuplicateSeparateKeys([]);

      // The calendar updates above are intentionally committed before the
      // network sync starts, so the user sees the new item immediately.
      if (addedSessions.length > 0) {
        window.dispatchEvent(new CustomEvent("onpace-calendar-updated"));
        void syncSessionsToGoogle(
          addedSessions,
          batch.source
        );
      }
      if (tasksToInsert.length > 0) {
        window.dispatchEvent(new CustomEvent("onpace-tasks-updated"));
      }
    } catch (error) {
      setCustomAlert(
        error instanceof Error
          ? error.message
          : "Calendar items could not be saved."
      );
    } finally {
      setCommittingBatch(false);
      setIsSyncing(false);
      setOcrLoading(false);
      setIsPlanning(false);
      setIsPlanningDay(false);
    }
  };

  const analyzeAndCommitCalendarBatch = async (
    batch: CalendarInsertBatch,
    allowOverlaps = false
  ) => {
    if (!allowOverlaps) {
      const scheduledSessions = [...studySessions];
      const timeConflicts: CalendarTimeConflict[] = [];

      batch.sessions.forEach((session, sessionIndex) => {
        const startTime = String(session.start_time || "");
        const durationMinutes = Math.max(15, Number(session.duration) || 60);
        const start = new Date(startTime);
        if (Number.isNaN(start.getTime())) return;
        const end = new Date(start.getTime() + durationMinutes * 60_000);
        const conflicts = scheduledSessions.filter((existing) => {
          const existingStart = new Date(String(existing.start_time));
          const existingEnd = getSessionEndTime(existing);
          return existingStart < end && existingEnd > start;
        });

        if (conflicts.length > 0) {
          const alternativeStart = findNextAvailableStart(
            start.toISOString(),
            durationMinutes,
            scheduledSessions
          );
          timeConflicts.push({
            sessionIndex,
            title: String(session.title || "Study session"),
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            alternativeStart,
            alternativeEnd: alternativeStart
              ? new Date(
                  new Date(alternativeStart).getTime() + durationMinutes * 60_000
                ).toISOString()
              : null,
            conflictingSessions: conflicts.map((existing) => ({
              title: String(existing.title || "Calendar event"),
              startTime: String(existing.start_time),
              endTime: getSessionEndTime(existing).toISOString(),
            })),
          });
        }
        scheduledSessions.push({ ...session, end_time: end.toISOString() });
      });

      if (timeConflicts.length > 0) {
        setTimeConflictReview({ batch, conflicts: timeConflicts });
        setIsSyncing(false);
        setIsPlanning(false);
        setIsPlanningDay(false);
        setOcrLoading(false);
        return;
      }
    }

    const items = [
      ...batch.sessions.map((session, index) => ({
        key: `session:${index}`,
        type: "session",
        title: String(session.title || ""),
        at: typeof session.start_time === "string" ? session.start_time : null,
        duration: Number(session.duration) || 60,
      })),
      ...batch.tasks.map((task, index) => ({
        key: `task:${index}`,
        type: "task",
        title: String(task.title || ""),
        at: typeof task.due_date === "string" ? task.due_date : null,
        duration: Number(task.estimated_minutes) || 30,
      })),
    ];

    try {
      const response = await fetch("/api/calendar/deduplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Duplicate analysis failed.");
      }
      const conflicts = Array.isArray(result.conflicts)
        ? result.conflicts as DuplicateConflict[]
        : [];
      if (conflicts.length > 0) {
        setDuplicateReview({ batch, conflicts });
        setDuplicateSeparateKeys([]);
        setIsSyncing(false);
        setOcrLoading(false);
        setIsPlanning(false);
        setIsPlanningDay(false);
        return;
      }
    } catch (error) {
      console.warn("Duplicate analysis unavailable; exact database constraints still apply.", error);
    }

    await commitCalendarBatch(batch);
  };

  const resolveTimeConflicts = async (useAlternatives: boolean) => {
    if (!timeConflictReview) return;
    const conflictByIndex = new Map(
      timeConflictReview.conflicts.map((conflict) => [conflict.sessionIndex, conflict])
    );
    const batch = {
      ...timeConflictReview.batch,
      sessions: timeConflictReview.batch.sessions.map((session, index) => {
        const conflict = conflictByIndex.get(index);
        if (!useAlternatives || !conflict?.alternativeStart || !conflict.alternativeEnd) {
          return session;
        }
        return {
          ...session,
          start_time: conflict.alternativeStart,
          end_time: conflict.alternativeEnd,
        };
      }),
    };
    setTimeConflictReview(null);
    await analyzeAndCommitCalendarBatch(batch, !useAlternatives);
  };

  const handleManualCalendarSync = async (reviewDuplicates = false) => {
    if (!googleConnected || calendarSyncLock.current) return;
    if (reviewDuplicates) {
      try {
        const duplicateResponse = await fetch("/api/calendar/duplicates", {
          cache: "no-store",
        });
        const duplicateResult = await duplicateResponse.json().catch(() => ({}));
        if (duplicateResponse.ok && Array.isArray(duplicateResult.duplicates) && duplicateResult.duplicates.length > 0) {
          setExistingDuplicateReview(duplicateResult.duplicates);
          setExistingDuplicateKeepSeparate([]);
          return;
        }
      } catch (error) {
        console.warn("Existing duplicate scan could not be completed.", error);
      }
    }
    calendarSyncLock.current = true;
    setCalendarSyncing(true);
    try {
      const response = await fetch("/api/calendar/sync", { method: "POST" });
      const syncResult = await response.json().catch(() => ({}));
      if (!response.ok || !syncResult.success) {
        throw new Error(syncResult.error || "Google Calendar synchronization failed.");
      }
      const { data: refreshedSessions, error } = await supabase
        .from("study_sessions")
        .select("*, courses(name, color)")
        .order("start_time", { ascending: true });
      if (error) throw new Error(error.message);
      setStudySessions((refreshedSessions || []).map((session) => ({
        ...session,
        isGoogleEvent: Boolean(session.google_event_id),
      })));
      setLastCalendarSyncAt(syncResult.lastSyncAt || new Date().toISOString());
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : "Google Calendar synchronization failed.");
    } finally {
      calendarSyncLock.current = false;
      setCalendarSyncing(false);
    }
  };

  const handleMergeExistingDuplicates = async () => {
    if (!existingDuplicateReview) return;
    setMergingExistingDuplicates(true);
    try {
      const keepSeparate = new Set(existingDuplicateKeepSeparate);
      for (const duplicate of existingDuplicateReview) {
        if (keepSeparate.has(duplicate.duplicateId)) continue;
        if (duplicate.type === "task") {
          const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", duplicate.duplicateId);
          if (error) throw new Error(error.message);
          setTasks((current) => current.filter((task) => task.id !== duplicate.duplicateId));
          continue;
        }

        if (googleConnected) {
          const response = await fetch("/api/calendar/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ localSessionId: duplicate.duplicateId }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.success) {
            throw new Error(result.error || "Duplicate calendar event could not be merged.");
          }
        } else {
          const duplicateSession = studySessions.find(
            (session) => session.id === duplicate.duplicateId
          );
          if (duplicateSession?.google_event_id) {
            const { error: tombstoneError } = await supabase
              .from("calendar_sync_tombstones")
              .upsert({
                user_id: duplicateSession.user_id,
                calendar_id: duplicateSession.google_calendar_id || "primary",
                google_event_id: duplicateSession.google_event_id,
              }, {
                onConflict: "user_id,calendar_id,google_event_id",
              });
            if (tombstoneError) throw new Error(tombstoneError.message);
          }
          const { error } = await supabase
            .from("study_sessions")
            .delete()
            .eq("id", duplicate.duplicateId);
          if (error) throw new Error(error.message);
        }
        setStudySessions((current) =>
          current.filter((session) => session.id !== duplicate.duplicateId)
        );
      }
      setExistingDuplicateReview(null);
      setExistingDuplicateKeepSeparate([]);
      await handleManualCalendarSync(false);
    } catch (error) {
      setCustomAlert(
        error instanceof Error
          ? error.message
          : "Duplicate items could not be merged."
      );
    } finally {
      setMergingExistingDuplicates(false);
    }
  };

  useEffect(() => {
    if (!googleConnected) return;

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void handleManualCalendarSync(false);
      }
    };
    const intervalId = window.setInterval(syncWhenVisible, 60_000);
    window.addEventListener("focus", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [googleConnected]);

  useEffect(() => {
    const refreshCalendar = () => void loadAllData(true);
    window.addEventListener("onpace-calendar-updated", refreshCalendar);
    window.addEventListener("onpace-tasks-updated", refreshCalendar);
    return () => {
      window.removeEventListener("onpace-calendar-updated", refreshCalendar);
      window.removeEventListener("onpace-tasks-updated", refreshCalendar);
    };
  }, [router, supabase]);

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSyncing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startDateTime = new Date(`${dateStr}T${startTime}:00`).toISOString();

    const newSessionPayload = {
      user_id: user.id,
      course_id: courseId || null,
      title: title.trim(),
      start_time: startDateTime,
      duration: parseInt(duration) || 60
    };

    await analyzeAndCommitCalendarBatch({
      sessions: [newSessionPayload],
      tasks: [],
      source: "Created via OnPace Study Calendar",
      closeAfter: "session",
    });
  };

  const handleInitAIPlanner = async () => {
    setAiPlannerOpen(true);
    setIsPlanning(true);

    const todoTasks = tasks.filter(t => t.status === "todo");
    if (todoTasks.length === 0) {
      setProposedSessions([]);
      setIsPlanning(false);
      return;
    }

    const proposed: any[] = [];
    const today = new Date();

    todoTasks.slice(0, 5).forEach((t, idx) => {
      const pDate = new Date(today);
      pDate.setDate(today.getDate() + (idx % 3) + 1);
      const dateString = pDate.toISOString().split("T")[0];
      const hour = 14 + (idx % 4) * 2;
      const startT = `${hour < 10 ? '0' : ''}${hour}:00`;

      proposed.push({
        title: `Deep Focus: ${t.title}`,
        course_id: t.course_id,
        course_name: t.courses?.name || "General",
        dateStr: dateString,
        startTime: startT,
        duration: t.estimated_minutes || 60
      });
    });

    setProposedSessions(proposed);
    setIsPlanning(false);
  };

  const handleConfirmAIPlan = async () => {
    setIsPlanning(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const insertPayloads = proposedSessions.map(p => ({
      user_id: user.id,
      course_id: p.course_id || null,
      title: p.title,
      start_time: new Date(`${p.dateStr}T${p.startTime}:00`).toISOString(),
      duration: p.duration
    }));

    await analyzeAndCommitCalendarBatch({
      sessions: insertPayloads,
      tasks: [],
      source: "Created by OnPace AI Study Schedule",
      closeAfter: "ai-plan",
    });
  };

  // ── Vision OCR Image Upload Handler ──────────────────────────────────────
  const handleOcrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 6 * 1024 * 1024
    ) {
      setOcrError(calendarCopy.invalidImage);
      e.target.value = "";
      return;
    }

    setOcrLoading(true);
    setOcrError(null);
    setOcrPreviewEvents([]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch("/api/calendar/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64Data,
              mimeType: file.type,
            }),
          });

          const data = await res.json().catch(() => null);
          if (!res.ok) {
            setOcrError(data?.error || calendarCopy.readError);
          } else if (Array.isArray(data?.events) && data.events.length > 0) {
            setOcrPreviewEvents(data.events);
            if (data.discardedCount > 0) {
              setOcrError(data.warning || null);
            }
          } else {
            setOcrError(data?.warning || calendarCopy.noEvents);
          }
        } catch {
          setOcrError(calendarCopy.readError);
        } finally {
          setOcrLoading(false);
          e.target.value = "";
        }
      };
      reader.onerror = () => {
        setOcrError(calendarCopy.readError);
        setOcrLoading(false);
        e.target.value = "";
      };
      reader.readAsDataURL(file);
    } catch {
      setOcrError(calendarCopy.readError);
      setOcrLoading(false);
    }
  };

  const updateOcrPreviewEvent = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setOcrPreviewEvents((current) =>
      current.map((event, eventIndex) =>
        eventIndex === index ? { ...event, [field]: value } : event
      )
    );
  };

  const handleConfirmOcrEvents = async () => {
    if (ocrPreviewEvents.length === 0) return;
    setOcrLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const insertSessions: any[] = [];
    const insertTasks: any[] = [];

    ocrPreviewEvents.forEach((ev) => {
      let targetDate = new Date(today);
      if (ev.dateStr) {
        targetDate = new Date(ev.dateStr);
      } else if (typeof ev.dayOfWeek === "number") {
        const currentDay = today.getDay();
        const diff = (ev.dayOfWeek + 7 - currentDay) % 7;
        targetDate.setDate(today.getDate() + diff);
      }

      const sTime = ev.startTime || "09:00";
      const startDateTime = new Date(`${targetDate.toISOString().split("T")[0]}T${sTime}:00`).toISOString();

      if (ev.type === "task") {
        insertTasks.push({
          user_id: user.id,
          title: ev.title,
          status: "todo",
          priority: "medium",
          estimated_minutes: ev.durationMinutes || 30,
          due_date: startDateTime,
        });
      } else {
        insertSessions.push({
          user_id: user.id,
          title: ev.title,
          start_time: startDateTime,
          duration: ev.durationMinutes || 60,
        });
      }
    });

    await analyzeAndCommitCalendarBatch({
      sessions: insertSessions,
      tasks: insertTasks,
      source: "Imported from an image by OnPace Vision AI",
      closeAfter: "ocr",
    });
  };

  // ── Plan My Day Interactive AI Handler ──────────────────────────────────
  const handleOpenPlanMyDay = useCallback(async () => {
    setPlanMyDayOpen(true);
    setIsPlanningDay(true);
    setDayPlanBlocks([]);
    setDayPlanNote("");

    try {
      const now = new Date();
      const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
      const response = await fetch("/api/calendar/plan-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: localDate,
          currentLocalTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI could not create a plan.");
      }
      setDayPlanBlocks(data.blocks || []);
      setDayPlanNote(data.note || "");
    } catch (error) {
      setDayPlanNote(
        error instanceof Error
          ? error.message
          : "AI could not create a plan."
      );
    } finally {
      setIsPlanningDay(false);
    }
  }, []);

  const handleConfirmDayPlan = async () => {
    if (dayPlanBlocks.length === 0) return;
    if (
      dayPlanBlocks.some(
        (block) =>
          !String(block.title || "").trim() ||
          !/^\d{2}:\d{2}$/.test(String(block.startTime || "")) ||
          !Number.isFinite(Number(block.duration)) ||
          Number(block.duration) < 15 ||
          Number(block.duration) > 180
      )
    ) {
      setCustomAlert(
        lang === "tr"
          ? "Plan bloklarında başlık, geçerli saat ve 15-180 dakika arası süre olmalıdır."
          : lang === "es"
            ? "Cada bloque necesita un título, una hora válida y una duración de 15 a 180 minutos."
            : lang === "zh"
              ? "每个计划块都需要标题、有效时间和 15–180 分钟的时长。"
              : "Each plan block needs a title, valid time, and a duration between 15 and 180 minutes."
      );
      return;
    }
    setIsPlanningDay(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payloads = dayPlanBlocks.map((b) => ({
      user_id: user.id,
      title: b.title.trim(),
      start_time: new Date(`${b.dateStr}T${b.startTime}:00`).toISOString(),
      duration: Number(b.duration),
    }));

    await analyzeAndCommitCalendarBatch({
      sessions: payloads,
      tasks: [],
      source: "Created by OnPace AI Day Planner",
      closeAfter: "day-plan",
    });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = new Date(year, month, 1).getDay();

  const locale =
    lang === "tr" ? "tr-TR" : lang === "es" ? "es-ES" : lang === "zh" ? "zh-CN" : "en-US";
  const localizedMonths = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2024, index, 1)
    )
  );
  const localizedWeekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2024, 6, 7 + index)
    )
  );

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    const prevDate = new Date(year, month, 0 - (firstDayIndex - 1 - i));
    cells.push(prevDate);
  }
  for (let i = 1; i <= totalDays; i++) {
    cells.push(new Date(year, month, i));
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(new Date(year, month + 1, i));
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const getEventsForDay = (date: Date) => {
    const dStr = date.toDateString();
    const dayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === dStr);
    const daySessions = studySessions.filter(s => s.start_time && new Date(s.start_time).toDateString() === dStr);
    return { tasks: dayTasks, sessions: daySessions };
  };

  useEffect(() => {
    if (
      searchParams.get("plan") !== "today" ||
      loading ||
      autoPlanHandled.current
    ) {
      return;
    }
    autoPlanHandled.current = true;
    void handleOpenPlanMyDay();
    window.history.replaceState(null, "", "/calendar");
  }, [handleOpenPlanMyDay, loading, searchParams]);

  const formatSessionRange = (start: string, end: string) => {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formatter.format(new Date(start))}–${formatter.format(new Date(end))}`;
  };

  return (
    <main className="flex-1 p-6 lg:p-10 overflow-y-auto space-y-8 max-w-6xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
            <CalendarDays className="text-brand" /> {t.calendar.title}
            {googleConnected && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${calendarSyncing ? "animate-pulse" : ""}`}></span>
                {calendarSyncing
                  ? (lang === "tr" ? "Senkronize ediliyor" : lang === "zh" ? "正在同步" : lang === "es" ? "Sincronizando" : "Syncing")
                  : (lang === "tr" ? "Google bağlı" : lang === "zh" ? "Google 已连接" : lang === "es" ? "Google conectado" : "Google connected")}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.calendar.subtitle}</p>
          {googleConnected && lastCalendarSyncAt && (
            <p className="text-[11px] text-gray-400 mt-1">
              {lang === "tr" ? "Son senkronizasyon" : lang === "zh" ? "上次同步" : lang === "es" ? "Última sincronización" : "Last sync"}:{" "}
              {new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : lang === "zh" ? "zh-CN" : lang === "es" ? "es-ES" : "en-US", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(lastCalendarSyncAt))}
            </p>
          )}
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
          {googleConnected && (
            <button
              onClick={() => void handleManualCalendarSync(true)}
              disabled={calendarSyncing}
              className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-2.5 text-xs font-bold hover:bg-emerald-100 disabled:opacity-60 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RefreshCw size={15} className={calendarSyncing ? "animate-spin" : ""} />
              {lang === "tr" ? "Şimdi senkronize et" : lang === "zh" ? "立即同步" : lang === "es" ? "Sincronizar ahora" : "Sync now"}
            </button>
          )}

          {/* Vision OCR Schedule Button */}
          <button
            onClick={() => setOcrModalOpen(true)}
            className="rounded-xl bg-purple-50 text-purple-700 border border-purple-200 px-3.5 py-2.5 text-xs font-bold hover:bg-purple-100 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Camera size={15} /> {t.calendar.uploadScheduleImage || "Görselden Program Yükle"}
          </button>

          {/* Plan My Day AI Button */}
          <button
            onClick={handleOpenPlanMyDay}
            className="rounded-xl bg-gradient-to-r from-brand to-brand-dark text-white px-3.5 py-2.5 text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={15} className="animate-pulse" /> {t.calendar.planMyDay || "Benim İçin Bugünümü Planla"}
          </button>

          <button
            onClick={() => setSessionOpen(true)}
            className="rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-hover active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} /> {t.calendar.addSession}
          </button>
        </div>
      </div>

      {/* Calendar Grid Shell */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Month selector toolbar */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-surface-dark">
            {localizedMonths[month]} {year}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
            >
              {t.calendar.today}
            </button>
            <button
              onClick={() => navigateMonth("next")}
              className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-surface-secondary/50 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider py-2.5">
          {localizedWeekdays.map((weekday, index) => (
            <div key={`${weekday}-${index}`}>{weekday}</div>
          ))}
        </div>

        {/* Month Grid Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-100 text-xs">
          {cells.map((date, idx) => {
            if (!date) return <div key={idx} className="h-32 bg-gray-50/30" />;

            const isCurrentMonth = date.getMonth() === month;
            const isToday = date.toDateString() === new Date().toDateString();
            const { tasks: dayTasks, sessions: daySessions } = getEventsForDay(date);

            return (
              <div
                key={idx}
                className={`min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                  isCurrentMonth ? "bg-white" : "bg-gray-50/40 text-gray-300"
                } ${isToday ? "ring-2 ring-brand/30 bg-brand/5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                      isToday
                        ? "bg-brand text-white shadow-sm"
                        : isCurrentMonth
                        ? "text-surface-dark"
                        : "text-gray-400"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>

                <div className="space-y-1 my-1 overflow-y-auto max-h-24">
                  {daySessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => openSessionDetails(s)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-white truncate cursor-pointer transition-all hover:opacity-90 shadow-2xs"
                      style={{ backgroundColor: s.courses?.color || "#4F46E5" }}
                    >
                      {s.formattedTime || (s.start_time ? new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "")} {s.title}
                    </div>
                  ))}
                  {dayTasks.map(t => (
                    <div
                      key={t.id}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium bg-gray-100 text-gray-700 truncate border border-gray-200/50"
                    >
                      ✓ {t.title}
                    </div>
                  ))}
                </div>

                <div className="text-[9px] text-gray-400 text-right">
                  {daySessions.length > 0 && `${daySessions.length} ${calendarCopy.sessionsShort}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Edit or delete a local/Google calendar event */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 border border-gray-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-surface-dark">
                  {lang === "tr" ? "Takvim etkinliğini düzenle" : lang === "zh" ? "编辑日历事件" : lang === "es" ? "Editar evento" : "Edit calendar event"}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  {selectedSession.isGoogleEvent ? "Google Calendar" : "OnPace Calendar"}
                </p>
              </div>
              <button type="button" onClick={closeSessionDetails} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSessionEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.sessionTitle}</label>
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  required
                  className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                />
              </div>

              {!selectedSession.isGoogleEvent && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.course}</label>
                  <select
                    value={editCourseId}
                    onChange={(event) => setEditCourseId(event.target.value)}
                    className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none"
                  >
                    <option value="">-- {t.calendar.noCourse} --</option>
                    {courses.map((course) => <option key={course.id} value={course.id}>{getLocalizedCourseName(course.name, lang)}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.date}</label>
                  <input type="date" value={editDateStr} onChange={(event) => setEditDateStr(event.target.value)} required className="block w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-surface-dark bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.startTime}</label>
                  <input type="time" value={editStartTime} onChange={(event) => setEditStartTime(event.target.value)} required className="block w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-surface-dark bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.duration}</label>
                <input type="number" min={15} max={480} value={editDuration} onChange={(event) => setEditDuration(event.target.value)} required className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-surface-dark bg-white" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleDeleteSession} disabled={savingEdit || deletingSession} className="px-3 py-2.5 border border-red-100 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50" title={calendarCopy.deleteEvent}>
                  {deletingSession ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
                <button type="button" onClick={closeSessionDetails} disabled={savingEdit || deletingSession} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  {lang === "tr" ? "Vazgeç" : lang === "zh" ? "取消" : lang === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button type="submit" disabled={savingEdit || deletingSession} className="flex-1 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {lang === "tr" ? "Kaydet" : lang === "zh" ? "保存" : lang === "es" ? "Guardar" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Google Calendar Link Prompt Popup (ONLY if !googleConnected) */}
      {showLinkPrompt && !googleConnected && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 relative border border-gray-100 shadow-xl text-center">
            <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-sm">
              <Globe size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-surface-dark">
                {t.calendar.googleSyncNoticeTitle || "Google Takviminizi Bağlayın"}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t.calendar.googleSyncNoticeDesc ||
                  "Google hesabınızı bağlamadığınız için takvim verileriniz sadece bu platformda yerel olarak saklanır. Gerçek zamanlı senkronizasyon, çakışma önleme ve otomatik planlama için Google Takviminizi bağlayabilirsiniz."}
              </p>
            </div>
            
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  setShowLinkPrompt(false);
                  window.dispatchEvent(new CustomEvent("open-settings", { detail: "google" }));
                }}
                className="w-full py-3 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                ⚙️ {lang === "tr" ? "Ayarlara Git" : lang === "zh" ? "前往设置" : lang === "es" ? "Ir a Ajustes" : "Go to Settings"}
              </button>
              <button
                onClick={() => {
                  sessionStorage.setItem(
                    "onpace_google_calendar_prompt_dismissed",
                    "true"
                  );
                  setShowLinkPrompt(false);
                }}
                className="w-full py-2.5 bg-gray-50 border border-gray-150 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                {t.calendar.continueWithoutGoogle || "Google Olmadan Devam Et"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vision OCR Schedule Image Upload */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 border border-gray-100 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera size={20} className="text-purple-600" />
                <h3 className="text-base font-bold text-surface-dark">
                  {t.calendar.uploadScheduleImage || "Görselden Program Yükle (Vision AI)"}
                </h3>
              </div>
              <button onClick={() => setOcrModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              {calendarCopy.ocrDescription}
            </p>

            <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 text-center hover:bg-purple-50/50 transition-all cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleOcrImageUpload}
                disabled={ocrLoading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload size={28} className="mx-auto text-purple-600 mb-2" />
              <p className="text-xs font-bold text-purple-700">{calendarCopy.chooseImage}</p>
              <p className="text-[10px] text-gray-400 mt-1">{calendarCopy.supported}</p>
            </div>

            {ocrLoading && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold flex items-center gap-2 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                {calendarCopy.reading}
              </div>
            )}

            {ocrError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                {ocrError}
              </div>
            )}

            {ocrPreviewEvents.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-surface-dark">
                    {calendarCopy.found} ({ocrPreviewEvents.length}):
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{calendarCopy.reviewHint}</p>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {ocrPreviewEvents.map((ev, i) => (
                    <div key={i} className="space-y-2 rounded-xl border border-gray-150 bg-gray-50 p-3 text-xs">
                      <div className="flex items-start gap-2">
                        <label className="min-w-0 flex-1 space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{calendarCopy.titleLabel}</span>
                          <input
                            required
                            maxLength={160}
                            value={ev.title || ""}
                            onChange={(event) => updateOcrPreviewEvent(i, "title", event.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-surface-dark outline-none focus:border-purple-400"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setOcrPreviewEvents((current) => current.filter((_, index) => index !== i))}
                          className="mt-5 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          aria-label={calendarCopy.remove}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{calendarCopy.startLabel}</span>
                          <input
                            type="time"
                            value={ev.startTime || "09:00"}
                            onChange={(event) => updateOcrPreviewEvent(i, "startTime", event.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] text-surface-dark"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{calendarCopy.durationLabel}</span>
                          <input
                            type="number"
                            min={10}
                            max={480}
                            step={5}
                            value={ev.durationMinutes || 60}
                            onChange={(event) => updateOcrPreviewEvent(i, "durationMinutes", Number(event.target.value))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] text-surface-dark"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Type</span>
                          <select
                            value={ev.type === "task" ? "task" : "session"}
                            onChange={(event) => updateOcrPreviewEvent(i, "type", event.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] text-surface-dark"
                          >
                            <option value="session">{calendarCopy.typeSession}</option>
                            <option value="task">{calendarCopy.typeTask}</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleConfirmOcrEvents}
                  disabled={ocrLoading || ocrPreviewEvents.some((event) => !String(event.title || "").trim())}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check size={16} /> {calendarCopy.addItems}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Plan My Day Interactive AI */}
      {planMyDayOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 border border-gray-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-brand animate-pulse" />
                <h3 className="text-base font-bold text-surface-dark">
                  {t.calendar.planMyDay || "Benim İçin Bugünümü Planla"}
                </h3>
              </div>
              <button onClick={() => setPlanMyDayOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {isPlanningDay ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
                <p className="text-xs font-bold text-gray-500">{calendarCopy.analyzing}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-brand/5 border border-brand/10 rounded-2xl text-xs text-brand-dark font-semibold">
                  {dayPlanNote}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {dayPlanBlocks.map((block, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-150 flex items-center gap-3 text-xs">
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          value={block.title}
                          onChange={(event) =>
                            setDayPlanBlocks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === idx ? { ...item, title: event.target.value } : item
                              )
                            )
                          }
                          className="w-full bg-transparent font-bold text-surface-dark outline-none border-b border-transparent focus:border-brand/30"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={block.startTime}
                            onChange={(event) =>
                              setDayPlanBlocks((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === idx ? { ...item, startTime: event.target.value } : item
                                )
                              )
                            }
                            className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-surface-dark caret-brand outline-none [color-scheme:light] focus:border-brand focus:ring-2 focus:ring-brand/15"
                          />
                          <input
                            type="number"
                            min={15}
                            max={180}
                            step={5}
                            value={block.duration}
                            onChange={(event) =>
                              setDayPlanBlocks((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === idx ? { ...item, duration: Number(event.target.value) } : item
                                )
                              )
                            }
                            className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-surface-dark caret-brand outline-none [color-scheme:light] focus:border-brand focus:ring-2 focus:ring-brand/15"
                          />
                          <span className="text-[10px] text-gray-400">{calendarCopy.minutes}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        {calendarCopy.today}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDayPlanBlocks((current) =>
                            current.filter((_, itemIndex) => itemIndex !== idx)
                          )
                        }
                        className="p-1 text-gray-400 hover:text-red-500"
                        aria-label="Remove plan block"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setPlanMyDayOpen(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 cursor-pointer"
                  >
                    {calendarCopy.cancel}
                  </button>
                  <button
                    onClick={handleConfirmDayPlan}
                    className="flex-1 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check size={16} /> {calendarCopy.confirmPlan}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Session Manual Form */}
      {sessionOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 border border-gray-100 shadow-xl">
            <h3 className="text-base font-bold text-surface-dark">{t.calendar.addSession}</h3>
            <form onSubmit={handleSaveSession} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.sessionTitle}</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.calendar.placeholderSession}
                  className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.course}</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer"
                >
                  <option value="">-- {t.calendar.noCourse} --</option>
                    {courses.map(c => (
                    <option key={c.id} value={c.id}>{getLocalizedCourseName(c.name, lang)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.date}</label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="block w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none text-surface-dark bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.startTime}</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="block w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none text-surface-dark bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.calendar.duration}</label>
                <input
                  type="number"
                  required
                  min={15}
                  max={480}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none text-surface-dark bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSessionOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="flex-1 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : t.calendar.saveSession}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {timeConflictReview && (
        <div className="fixed inset-0 z-[76] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 border border-gray-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-amber-500" />
                  <h3 className="text-base font-bold text-surface-dark">
                    {lang === "tr" ? "Bu saat takvimde dolu" : lang === "zh" ? "该时段已有日程" : lang === "es" ? "Este horario ya está ocupado" : "This time is already booked"}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {lang === "tr" ? "İstediğiniz etkinliği yine ekleyebilir veya önerilen boş saate taşıyabilirsiniz." : lang === "zh" ? "您可以继续按原时间添加，也可以使用建议的空闲时间。" : lang === "es" ? "Puedes mantener el horario solicitado o usar el siguiente horario libre sugerido." : "You can keep the requested time or use the suggested available time."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTimeConflictReview(null)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Close time conflict review"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {timeConflictReview.conflicts.map((conflict) => (
                <div key={`${conflict.sessionIndex}-${conflict.startTime}`} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 space-y-2">
                  <p className="text-xs font-bold text-surface-dark">{conflict.title}</p>
                  <p className="text-[11px] text-gray-600">
                    {formatSessionRange(conflict.startTime, conflict.endTime)}
                    {" · "}
                    {conflict.conflictingSessions.map((session) => `${session.title} (${formatSessionRange(session.startTime, session.endTime)})`).join(", ")}
                  </p>
                  {conflict.alternativeStart && conflict.alternativeEnd && (
                    <p className="text-[11px] font-semibold text-emerald-700">
                      {lang === "tr" ? "Önerilen boş saat" : lang === "zh" ? "建议空闲时段" : lang === "es" ? "Horario libre sugerido" : "Suggested available time"}: {formatSessionRange(conflict.alternativeStart, conflict.alternativeEnd)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!timeConflictReview.conflicts.every((conflict) => conflict.alternativeStart)}
                onClick={() => void resolveTimeConflicts(true)}
                className="rounded-xl bg-emerald-600 text-white py-3 text-xs font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-45 flex items-center justify-center gap-2"
              >
                <Check size={15} />
                {lang === "tr" ? "Evet, boş saati kullan" : lang === "zh" ? "是，使用空闲时段" : lang === "es" ? "Sí, usar horario libre" : "Yes, use free time"}
              </button>
              <button
                type="button"
                onClick={() => void resolveTimeConflicts(false)}
                className="rounded-xl bg-brand text-white py-3 text-xs font-bold shadow-sm hover:bg-brand-hover flex items-center justify-center gap-2"
              >
                <CalendarIcon size={15} />
                {lang === "tr" ? "Hayır, yine de ekle" : lang === "zh" ? "否，仍按原时间添加" : lang === "es" ? "No, añadir de todos modos" : "No, add anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      {existingDuplicateReview && (
        <div className="fixed inset-0 z-[75] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 border border-gray-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  <h3 className="text-base font-bold text-surface-dark">
                    {lang === "tr" ? "Takvimde yinelenen kayıtlar var" : lang === "zh" ? "日历中有重复项目" : lang === "es" ? "Hay elementos duplicados" : "Duplicate calendar items found"}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {lang === "tr" ? "Aynı görünen kayıtları tek kayıtta birleştirmeden önce seçiminizi onaylayın." : lang === "zh" ? "合并相同项目之前，请确认您的选择。" : lang === "es" ? "Confirma antes de combinar los elementos iguales." : "Confirm before identical items are merged into one."}
                </p>
              </div>
              <button type="button" onClick={() => setExistingDuplicateReview(null)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {existingDuplicateReview.map((duplicate) => {
                const keepSeparate = existingDuplicateKeepSeparate.includes(duplicate.duplicateId);
                return (
                  <div key={duplicate.duplicateId} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 space-y-3">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                      <p className="font-bold text-surface-dark truncate">{duplicate.title}</p>
                      <span className="text-gray-400">≈</span>
                      <p className="font-bold text-surface-dark truncate">{duplicate.canonicalTitle}</p>
                    </div>
                    <p className="text-[11px] text-gray-500">{duplicate.reason}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExistingDuplicateKeepSeparate((current) =>
                            current.filter((id) => id !== duplicate.duplicateId)
                          )
                        }
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold border ${
                          !keepSeparate ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200"
                        }`}
                      >
                        {lang === "tr" ? "Tek kayıtta birleştir" : lang === "zh" ? "合并" : lang === "es" ? "Combinar" : "Merge"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExistingDuplicateKeepSeparate((current) =>
                            current.includes(duplicate.duplicateId)
                              ? current
                              : [...current, duplicate.duplicateId]
                          )
                        }
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold border ${
                          keepSeparate ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-200"
                        }`}
                      >
                        {lang === "tr" ? "Ayrı kalsın" : lang === "zh" ? "保持分开" : lang === "es" ? "Mantener separado" : "Keep separate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={mergingExistingDuplicates}
              onClick={() => void handleMergeExistingDuplicates()}
              className="w-full rounded-xl bg-brand text-white py-3 text-xs font-bold shadow-sm hover:bg-brand-hover disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {mergingExistingDuplicates ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {lang === "tr" ? "Seçimleri uygula ve senkronize et" : lang === "zh" ? "应用并同步" : lang === "es" ? "Aplicar y sincronizar" : "Apply and sync"}
            </button>
          </div>
        </div>
      )}

      {duplicateReview && (
        <div className="fixed inset-0 z-[75] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 border border-gray-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  <h3 className="text-base font-bold text-surface-dark">
                    {lang === "tr"
                      ? "Benzer kayıtlar bulundu"
                      : lang === "es"
                        ? "Se encontraron elementos similares"
                        : lang === "zh"
                          ? "发现相似项目"
                          : "Similar items found"}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {lang === "tr"
                    ? "AI, eklemek istediğiniz bazı öğelerin mevcut kayıtlarla aynı olabileceğini düşünüyor. Varsayılan olarak tek kayıt korunur."
                    : lang === "es"
                      ? "La IA cree que algunos elementos pueden estar duplicados. De forma predeterminada se conservará un solo elemento."
                      : lang === "zh"
                        ? "AI 认为部分项目可能重复。默认只保留一个项目。"
                        : "AI thinks some incoming items may duplicate existing records. One item is kept by default."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateReview(null)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Close duplicate review"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {duplicateReview.conflicts.map((conflict) => {
                const addSeparately = duplicateSeparateKeys.includes(conflict.incomingKey);
                const [type, rawIndex] = conflict.incomingKey.split(":");
                const index = Number(rawIndex);
                const incoming = type === "task"
                  ? duplicateReview.batch.tasks[index]
                  : duplicateReview.batch.sessions[index];
                return (
                  <div key={conflict.incomingKey} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 space-y-3">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                      <p className="font-bold text-surface-dark truncate">
                        {String(incoming?.title || "")}
                      </p>
                      <span className="text-gray-400">≈</span>
                      <p className="font-bold text-surface-dark truncate">
                        {conflict.existingTitle}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500">{conflict.reason}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDuplicateSeparateKeys((current) =>
                            current.filter((key) => key !== conflict.incomingKey)
                          )
                        }
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold border transition-all ${
                          !addSeparately
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-gray-600 border-gray-200"
                        }`}
                      >
                        {lang === "tr" ? "Tek kayıtta birleştir" : lang === "zh" ? "合并为一个" : lang === "es" ? "Combinar en uno" : "Keep as one"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDuplicateSeparateKeys((current) =>
                            current.includes(conflict.incomingKey)
                              ? current
                              : [...current, conflict.incomingKey]
                          )
                        }
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold border transition-all ${
                          addSeparately
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-gray-600 border-gray-200"
                        }`}
                      >
                        {lang === "tr" ? "Ayrı olarak ekle" : lang === "zh" ? "单独添加" : lang === "es" ? "Añadir por separado" : "Add separately"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={committingBatch}
              onClick={() =>
                void commitCalendarBatch(
                  duplicateReview.batch,
                  duplicateReview.conflicts,
                  duplicateSeparateKeys
                )
              }
              className="w-full rounded-xl bg-brand text-white py-3 text-xs font-bold shadow-sm hover:bg-brand-hover disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {committingBatch
                ? <Loader2 size={16} className="animate-spin" />
                : <Check size={16} />}
              {lang === "tr" ? "Seçimleri uygula" : lang === "zh" ? "应用选择" : lang === "es" ? "Aplicar selección" : "Apply choices"}
            </button>
          </div>
        </div>
      )}

      {customAlert && (
        <div className="fixed bottom-5 right-5 z-[70] max-w-sm rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-xl flex items-start gap-3">
          <HelpCircle size={17} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-gray-700 leading-relaxed flex-1">{customAlert}</p>
          <button type="button" onClick={() => setCustomAlert(null)} className="text-gray-400 hover:text-gray-700" aria-label="Close alert">
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}
