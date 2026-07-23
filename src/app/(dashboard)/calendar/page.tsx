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
  Lock
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

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

  // Form states for scheduling study session
  const [sessionOpen, setSessionOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [savingSession, setSavingSession] = useState(false);

  // Google Calendar Integration States
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // AI Planner States
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [proposedSessions, setProposedSessions] = useState<any[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  // Custom Alert Popups replacing native alerts
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  const localizedMonths = lang === "zh"
    ? ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
    : lang === "es"
    ? ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    : [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

  const localizedDays = lang === "zh"
    ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    : lang === "es"
    ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const loadAllData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(profileData);

    // Load Google Calendar connection settings from localStorage
    const isGConnected = localStorage.getItem("googleConnected") === "true";
    const gEmail = localStorage.getItem("googleEmail") || "";
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

    const { data: sessionsData } = await supabase
      .from("study_sessions")
      .select("*, courses(name, color)")
      .eq("user_id", user.id);
    if (sessionsData) setStudySessions(sessionsData);

    setLoading(false);

    // If not connected, show the popup prompt to connect
    if (!isGConnected) {
      setShowLinkPrompt(true);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [router, supabase]);

  // Listen to profile/settings modal Google connection changes in Sidebar
  useEffect(() => {
    const handleSync = async () => {
      const isGConnected = localStorage.getItem("googleConnected") === "true";
      const gEmail = localStorage.getItem("googleEmail") || "";
      setGoogleConnected(isGConnected);
      setGoogleEmail(gEmail);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: sessionsData } = await supabase
          .from("study_sessions")
          .select("*, courses(name, color)")
          .eq("user_id", user.id);
        if (sessionsData) setStudySessions(sessionsData);
      }
    };

    window.addEventListener("calendar-sync", handleSync);
    return () => window.removeEventListener("calendar-sync", handleSync);
  }, [supabase]);

  // Export iCalendar (.ics) Feed
  const handleExportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OnPace//Study Calendar//EN\r\n";
    studySessions.forEach(session => {
      const start = new Date(session.start_time).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const end = new Date(session.end_time).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      icsContent += `BEGIN:VEVENT\r\nUID:${session.id}@onpace.app\r\nDTSTAMP:${start}\r\nDTSTART:${start}\r\nDTEND:${end}\r\nSUMMARY:${session.title}\r\nDESCRIPTION:Study block scheduled on OnPace\r\nEND:VEVENT\r\n`;
    });
    
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "onpace_study_schedule.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Auto-Planner Logic
  const handleInitAIPlanner = () => {
    const pendingTasks = tasks.filter(t => t.status !== "completed");
    if (pendingTasks.length === 0) {
      setCustomAlert(lang === "zh" ? "没有待完成的任务来生成学习计划！" : lang === "es" ? "¡No hay tareas pendientes para planificar!" : "No pending tasks found to plan study blocks!");
      return;
    }
    
    const baseDate = new Date();
    const proposed = pendingTasks.map((task, idx) => {
      const targetDate = new Date(baseDate);
      if (task.due_date) {
        const due = new Date(task.due_date);
        targetDate.setDate(due.getDate() - 1);
        if (targetDate < baseDate) {
          targetDate.setDate(baseDate.getDate() + idx);
        }
      } else {
        targetDate.setDate(baseDate.getDate() + idx + 1);
      }
      
      const hours = [14, 16, 18];
      const startHour = hours[idx % hours.length];
      targetDate.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date(targetDate);
      endTime.setHours(startHour + 1, 0, 0, 0);
      
      return {
        id: `temp-${idx}`,
        user_id: profile?.id,
        course_id: task.course_id,
        courseName: task.courses?.name || "General",
        courseColor: task.courses?.color || "#9CA3AF",
        title: `🪄 AI Plan: Study ${task.title}`,
        start_time: targetDate.toISOString(),
        end_time: endTime.toISOString(),
        is_ai_scheduled: true
      };
    });
    
    setProposedSessions(proposed);
    setAiPlannerOpen(true);
  };

  const handleConfirmAIPlanner = async () => {
    setIsPlanning(true);
    const blocksToInsert = proposedSessions.map(({ id, courseName, courseColor, ...rest }) => rest);
    
    const { data, error } = await supabase
      .from("study_sessions")
      .insert(blocksToInsert)
      .select("*, courses(name, color)");
      
    if (!error && data) {
      setStudySessions(prev => [...prev, ...data]);
      setAiPlannerOpen(false);
      setProposedSessions([]);
    } else {
      setCustomAlert("AI planner failed to schedule study sessions.");
    }
    setIsPlanning(false);
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateStr) return;
    setSavingSession(true);

    const start = new Date(`${dateStr}T${startTime}`);
    const end = new Date(start.getTime() + parseInt(duration) * 60 * 1000);

    const newSession = {
      user_id: profile.id,
      course_id: courseId || null,
      title: title.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_ai_scheduled: false
    };

    const { data, error } = await supabase
      .from("study_sessions")
      .insert([newSession])
      .select("*, courses(name, color)")
      .single();

    if (!error && data) {
      setStudySessions([...studySessions, data]);
      setTitle("");
      setCourseId("");
      setDateStr("");
      setStartTime("09:00");
      setSessionOpen(false);
    }
    setSavingSession(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells: Date[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    const prevDate = new Date(year, month, -firstDayIndex + i + 1);
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
        
        <div className="flex gap-2 flex-wrap">
          {googleConnected && (
            <button
              onClick={handleExportICS}
              className="rounded-xl bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-600 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              📤 {lang === "zh" ? "导出日历 (.ics)" : lang === "es" ? "Exportar (.ics)" : "Export (.ics)"}
            </button>
          )}

          <button
            onClick={handleInitAIPlanner}
            className="rounded-xl bg-brand-light border border-brand/10 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-light/70 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles size={16} /> {lang === "zh" ? "🪄 AI 智能排程" : lang === "es" ? "🪄 AI Auto-Planificación" : "🪄 AI Auto-Plan"}
          </button>
          
          <button
            onClick={() => setSessionOpen(true)}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> {t.calendar.addSession}
          </button>
        </div>
      </div>

      {/* Calendar Shell */}
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
              onClick={() => navigateMonth("next")}
              className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 py-3">
          {localizedDays.map((d, index) => (
            <div key={index}>{d}</div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 auto-rows-[100px] sm:auto-rows-[120px] divide-x divide-y divide-gray-100 bg-gray-100">
          {cells.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === month;
            const { tasks: dayTasks, sessions: daySessions } = getEventsForDay(date);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={idx}
                className={`p-2 bg-white flex flex-col justify-between overflow-hidden group ${
                  isCurrentMonth ? "text-surface-dark" : "text-gray-300"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                    isToday ? "bg-brand text-white" : ""
                  }`}>
                    {date.getDate()}
                  </span>
                </div>
                
                {/* Events list inside cell */}
                <div className="space-y-1 overflow-y-auto pr-0.5 mt-1 flex-1">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white truncate shadow-sm"
                      style={{ backgroundColor: task.courses?.color || "#9CA3AF" }}
                      title={`Task: ${task.title}`}
                    >
                      ✏️ {task.title}
                    </div>
                  ))}
                  {daySessions.map(session => {
                    const isGoogle = session.title.startsWith("📅 [Google]");
                    const isAi = session.title.startsWith("🪄 AI Plan:");
                    let bg = session.courses?.color || "#4F46E5";
                    if (isGoogle) bg = "#10B981"; // Emerald for google
                    if (isAi) bg = "#8B5CF6"; // Purple for AI plan
                    
                    return (
                      <div
                        key={session.id}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white truncate shadow-sm"
                        style={{ backgroundColor: bg }}
                        title={session.title}
                      >
                        {isGoogle ? "🗓️" : isAi ? "🪄" : "📖"} {session.title.replace("📅 [Google] ", "").replace("🪄 AI Plan: ", "")}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal: Google Calendar Link Prompt Popup */}
      {showLinkPrompt && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-sm">
              <Globe size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-surface-dark">
                {lang === "zh" ? "建议连接 Google 日历" : lang === "es" ? "Conectar Google Calendar" : "Sync Google Calendar"}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {lang === "zh" ? "在设置中连接您的谷歌账户，自动同步作业与备考排程，合理预防考试冲突。" : lang === "es" ? "Vincula tu cuenta de Google en la pestaña de Configuración para sincronizar tus fechas de examen y tareas pendientes." : "Link your Google account in Settings to enable real-time calendar syncing, exam scheduler optimizations, and prevent scheduling overlaps."}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowLinkPrompt(false);
                  router.push("/calendar?settings=google");
                }}
                className="w-full py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                ⚙️ {lang === "zh" ? "前往设置绑定" : lang === "es" ? "Ir a Configuración" : "Go to Settings"}
              </button>
              <button
                onClick={() => setShowLinkPrompt(false)}
                className="w-full py-2.5 bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                {lang === "zh" ? "以后再说" : lang === "es" ? "Continuar localmente" : "Continue without Google"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Auto-Planner Preview */}
      {aiPlannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative border border-gray-100 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-surface-dark flex items-center gap-2">
                  <Sparkles className="text-brand animate-pulse" size={20} /> {lang === "zh" ? "AI 智能自动排表" : lang === "es" ? "AI Auto-Planificador de Estudio" : "AI Auto-Planner Scheduler"}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{lang === "zh" ? "根据您的未完成任务及截止日期自动分派学习时段：" : lang === "es" ? "Hemos planificado bloques de estudio para tus tareas pendientes:" : "We scheduled study blocks based on your upcoming school tasks:"}</p>
              </div>
              <button onClick={() => setAiPlannerOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {proposedSessions.map((session) => (
                <div key={session.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-surface-dark">{session.title.replace("🪄 AI Plan: ", "")}</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                      📅 {new Date(session.start_time).toLocaleDateString()} @ {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase shrink-0"
                    style={{ backgroundColor: session.courseColor }}
                  >
                    {session.courseName}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setAiPlannerOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                {t.common.close}
              </button>
              <button
                type="button"
                onClick={handleConfirmAIPlanner}
                disabled={isPlanning}
                className="flex-1 py-2.5 bg-brand text-xs font-semibold rounded-xl text-white hover:bg-brand-hover cursor-pointer flex justify-center items-center gap-1.5 shadow-md"
              >
                {isPlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={14} />}
                {lang === "zh" ? "确认并排课" : lang === "es" ? "Confirmar y Planificar" : "Confirm Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal Dialog (Replaces native alert popups) */}
      {customAlert && (
        <div className="fixed inset-0 z-55 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-brand-light text-brand flex items-center justify-center mx-auto shadow-sm">
              <HelpCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-dark">{lang === "zh" ? "系统提示" : lang === "es" ? "Aviso" : "Notification"}</h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
            >
              {lang === "zh" ? "我知道了" : lang === "es" ? "Entendido" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

      {/* Modal Dialog for Scheduling Study Session */}
      {sessionOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 relative border border-gray-100 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-surface-dark flex items-center gap-2">
                  <Clock className="text-brand" /> {t.calendar.addSession}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Commit to a study slot on your calendar.</p>
              </div>
              <button onClick={() => setSessionOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSession} className="space-y-4">
              <div>
                <label htmlFor="sTitle" className="block text-xs font-bold text-gray-500 uppercase">{t.calendar.sessionTitle}</label>
                <input
                  id="sTitle"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.calendar.placeholderSession}
                  className="block w-full mt-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                />
              </div>

              <div>
                <label htmlFor="sCourse" className="block text-xs font-bold text-gray-500 uppercase">{t.calendar.course}</label>
                <select
                  id="sCourse"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="block w-full mt-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark outline-none cursor-pointer"
                >
                  <option value="">{t.calendar.noCourse}</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sDate" className="block text-xs font-bold text-gray-500 uppercase">{t.calendar.date}</label>
                <input
                  id="sDate"
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="block w-full mt-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark outline-none cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sTime" className="block text-xs font-bold text-gray-500 uppercase">{t.calendar.startTime}</label>
                  <input
                    id="sTime"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="block w-full mt-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="sDuration" className="block text-xs font-bold text-gray-500 uppercase">{t.calendar.duration}</label>
                  <select
                    id="sDuration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="block w-full mt-1 px-3 py-3 border border-gray-200 rounded-xl text-sm bg-white text-surface-dark outline-none cursor-pointer"
                  >
                    <option value="30">30 {t.common.minutes}</option>
                    <option value="60">60 {t.common.minutes}</option>
                    <option value="90">90 {t.common.minutes}</option>
                    <option value="120">120 {t.common.minutes}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSessionOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  {t.common.close}
                </button>
                <button
                  type="submit"
                  disabled={savingSession}
                  className="flex-1 py-2.5 bg-brand text-xs font-semibold rounded-xl text-white hover:bg-brand-hover cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {savingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : t.calendar.saveSession}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
