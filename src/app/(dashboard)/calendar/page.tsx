"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  X
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { getLocalizedCourseName } from "@/lib/course-labels";

export default function CalendarPage() {
  const router = useRouter();
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
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadAllData = async () => {
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

    // Load local sessions
    const { data: sessionsData } = await supabase
      .from("study_sessions")
      .select("*, courses(name, color)")
      .eq("user_id", user.id);

    let localSessions = sessionsData || [];

    // Load Google Calendar events dynamically if connected
    let fetchedGoogleEvents: any[] = [];
    if (isGConnected) {
      try {
        const res = await fetch("/api/calendar/list");
        if (res.ok) {
          const data = await res.json();
          if (data.events && Array.isArray(data.events)) {
            fetchedGoogleEvents = data.events.map((ev: any) => {
              const startObj = new Date(ev.start);
              const endObj = new Date(ev.end);
              const durationMins = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60)) || 60;
              const formattedTime = startObj.toTimeString().substring(0, 5);

              return {
                id: "google_" + ev.id,
                google_event_id: ev.id,
                user_id: user.id,
                title: `📅 [Google] ${ev.summary}`,
                start_time: ev.start,
                duration: durationMins,
                formattedTime: formattedTime,
                isGoogleEvent: true,
                description: ev.description,
                htmlLink: ev.htmlLink,
                courses: { name: "Google Calendar", color: "#4285F4" }
              };
            });
          }
        } else {
          const data = await res.json().catch(() => ({}));
          setGoogleConnected(false);
          setCustomAlert(data.error || "Google Calendar connection needs to be renewed.");
        }
      } catch (err) {
        console.error("Failed to load Google Calendar events:", err);
      }
    }

    const cleanLocalSessions = localSessions.filter(
      (s: { title: string }) => !s.title.startsWith("📅 [Google]")
    );
    setStudySessions([...cleanLocalSessions, ...fetchedGoogleEvents]);
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
    setEditTitle(String(session.title || "").replace(/^📅 \[Google\] /, ""));
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
    const endTimeIso = new Date(new Date(startTimeIso).getTime() + durationMinutes * 60_000).toISOString();
    setSavingEdit(true);

    try {
      if (selectedSession.isGoogleEvent) {
        const response = await fetch("/api/calendar/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: selectedSession.google_event_id,
            summary: editTitle.trim(),
            start: startTimeIso,
            end: endTimeIso,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || "Google Calendar event could not be updated.");

        setStudySessions((current) => current.map((session) =>
          session.id === selectedSession.id
            ? {
                ...session,
                title: `📅 [Google] ${editTitle.trim()}`,
                start_time: startTimeIso,
                duration: durationMinutes,
                formattedTime: editStartTime,
                description: data.event?.description || session.description,
              }
            : session
        ));
      } else {
        const { data, error } = await supabase
          .from("study_sessions")
          .update({
            title: editTitle.trim(),
            course_id: editCourseId || null,
            start_time: startTimeIso,
            duration: durationMinutes,
          })
          .eq("id", selectedSession.id)
          .select("*, courses(name, color)")
          .single();
        if (error) throw new Error(error.message);
        setStudySessions((current) => current.map((session) => session.id === selectedSession.id ? data : session));
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
      if (selectedSession.isGoogleEvent) {
        const response = await fetch("/api/calendar/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: selectedSession.google_event_id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || "Google Calendar event could not be deleted.");
      } else {
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
    description: string
  ) => {
    if (!googleConnected || sessions.length === 0) return true;
    const results = await Promise.all(
      sessions.map(async (session) => {
        try {
          const response = await fetch("/api/calendar/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: session.title,
              startTime: session.start_time,
              durationMinutes: session.duration,
              description,
            }),
          });
          const data = await response.json().catch(() => ({}));
          return response.ok && data.success ? null : data.error || "Google Calendar event could not be created.";
        } catch {
          return "Google Calendar could not be reached. Please try again.";
        }
      })
    );
    const failure = results.find(Boolean);
    if (failure) {
      setCustomAlert(String(failure));
      return false;
    }
    return true;
  };

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

    const { data, error } = await supabase
      .from("study_sessions")
      .insert([newSessionPayload])
      .select("*, courses(name, color)")
      .single();

    if (!error && data) {
      setStudySessions(prev => [...prev, data]);
      setSessionOpen(false);
      setTitle("");
      setCourseId("");

      await syncSessionsToGoogle([data], "Created via OnPace Study Calendar");
    } else {
      setCustomAlert("Error saving session: " + (error?.message || ""));
    }
    setIsSyncing(false);
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

    const { data, error } = await supabase
      .from("study_sessions")
      .insert(insertPayloads)
      .select("*, courses(name, color)");

    if (!error && data) {
      setStudySessions(prev => [...prev, ...data]);
      await syncSessionsToGoogle(data, "Created by OnPace AI Study Schedule");
      setAiPlannerOpen(false);
    }
    setIsPlanning(false);
  };

  // ── Vision OCR Image Upload Handler ──────────────────────────────────────
  const handleOcrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) {
      setOcrError("Please choose an image smaller than 6 MB.");
      e.target.value = "";
      return;
    }

    setOcrLoading(true);
    setOcrError(null);
    setOcrPreviewEvents([]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch("/api/calendar/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
          }),
        });

        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          setOcrPreviewEvents(data.events);
        } else {
          setOcrError(data.error || "No events found in schedule image.");
        }
        setOcrLoading(false);
        e.target.value = "";
      };
      reader.readAsDataURL(file);
    } catch {
      setOcrError("Failed to read image file.");
      setOcrLoading(false);
    }
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

    if (insertSessions.length > 0) {
      const { data: addedSessions } = await supabase
        .from("study_sessions")
        .insert(insertSessions)
        .select("*, courses(name, color)");
      if (addedSessions) {
        setStudySessions((prev) => [...prev, ...addedSessions]);
        await syncSessionsToGoogle(addedSessions, "Imported from an image by OnPace Vision AI");
      }
    }

    if (insertTasks.length > 0) {
      const { data: addedTasks } = await supabase
        .from("tasks")
        .insert(insertTasks)
        .select("*, courses(name, color)");
      if (addedTasks) setTasks((prev) => [...prev, ...addedTasks]);
    }

    setOcrModalOpen(false);
    setOcrPreviewEvents([]);
    setOcrLoading(false);
  };

  // ── Plan My Day Interactive AI Handler ──────────────────────────────────
  const handleOpenPlanMyDay = async () => {
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
  };

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

    const { data, error } = await supabase
      .from("study_sessions")
      .insert(payloads)
      .select("*, courses(name, color)");

    if (!error && data) {
      setStudySessions((prev) => [...prev, ...data]);
      await syncSessionsToGoogle(data, "Created by OnPace AI Day Planner");
      setPlanMyDayOpen(false);
    }
    setIsPlanningDay(false);
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

  return (
    <main className="flex-1 p-6 lg:p-10 overflow-y-auto space-y-8 max-w-6xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
            <CalendarDays className="text-brand" /> {t.calendar.title}
            {googleConnected && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {lang === "zh" ? "已同步 Google" : lang === "es" ? "Google Activo" : "Google Synced"}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.calendar.subtitle}</p>
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
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
          <div>{lang === "tr" ? "Paz" : "Sun"}</div>
          <div>{lang === "tr" ? "Pzt" : "Mon"}</div>
          <div>{lang === "tr" ? "Sal" : "Tue"}</div>
          <div>{lang === "tr" ? "Çar" : "Wed"}</div>
          <div>{lang === "tr" ? "Per" : "Thu"}</div>
          <div>{lang === "tr" ? "Cum" : "Fri"}</div>
          <div>{lang === "tr" ? "Cmt" : "Sat"}</div>
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
                  {daySessions.length > 0 && `${daySessions.length} sess`}
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
                <button type="button" onClick={handleDeleteSession} disabled={savingEdit || deletingSession} className="px-3 py-2.5 border border-red-100 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50" title={lang === "tr" ? "Etkinliği sil" : "Delete event"}>
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
                <p className="text-xs font-bold text-surface-dark">
                  {calendarCopy.found} ({ocrPreviewEvents.length}):
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {ocrPreviewEvents.map((ev, i) => (
                    <div key={i} className="p-2.5 bg-gray-50 rounded-xl border border-gray-150 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-surface-dark">{ev.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {ev.startTime} • {ev.durationMinutes} {calendarCopy.minutes} • {ev.type}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {ev.type}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleConfirmOcrEvents}
                  disabled={ocrLoading}
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
