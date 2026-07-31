"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearRememberSessionIntent } from "@/lib/auth/remember-session";
import {
  LogOut,
  CheckSquare,
  CalendarDays,
  Timer,
  Sparkles,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Lock,
  ChevronRight,
  ShieldCheck,
  Award,
  AlertCircle,
  Palette,
  Eye,
  Trash2
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { localeForLanguage, localized } from "@/lib/i18n";
import { getLocalizedCourseName, getSuggestedCourseCatalog } from "@/lib/course-labels";

const learningStyleNames: Record<string, Record<string, string>> = {
  visual: { tr: "Görsel", en: "Visual", es: "Visual", zh: "视觉" },
  auditory: { tr: "İşitsel", en: "Auditory", es: "Auditivo", zh: "听觉" },
  reading: { tr: "Okuma ve yazma", en: "Reading & writing", es: "Lectura y escritura", zh: "读写" },
  kinesthetic: { tr: "Uygulamalı", en: "Hands-on", es: "Práctico", zh: "动手实践" },
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);
  const dashboardCopy = localized(lang, {
    en: {
      customize: "Customize workspace",
      learningStyle: "Learning style:",
      todayCenter: "Today at a glance",
      nextUp: "Next up",
      setPace: "Set the pace for your day.",
      planHint: "Use your open tasks, goal, and available time to create a plan you can review before it is added.",
      planDay: "Plan my day with AI",
      startFocus: "Start focus",
      openTasks: "open tasks",
      scheduled: "min scheduled",
      addExam: "Add an exam",
      today: "today",
      daysLeft: "days left",
      examCountdown: "exam countdown",
      lastSevenDays: "Last 7 days",
      sessions: "sessions",
      overdueTasks: "overdue tasks",
      todaysPlan: "Today’s plan",
      generating: "Generating…",
      draftTitle: "AI study plan draft",
      draftHint: "Review and edit every suggestion before saving it.",
      saveDraft: "Save to AI study plan",
      planTask: "Plan task",
      removeSuggestion: "Remove suggestion",
      goalTitle: "Your daily focus goal",
      goalDescription: "This personalizes your study plan and progress card; it does not affect billing.",
      minutesPerDay: "Minutes per day",
      cancel: "Cancel",
      saving: "Saving…",
      saveGoal: "Save goal",
      savePlanError: "The plan could not be saved to your AI study plan.",
      saveGoalError: "Your daily goal could not be saved. Please try again.",
      noOpenTasks: "You have no open tasks today.",
      courseLimit: "The Free plan supports up to 2 courses. Upgrade for unlimited courses.",
      duplicateCourse: "This course is already in your list.",
      courseSaveError: "The course could not be saved.",
      deleteCourseConfirm: "Remove this course? Existing tasks will remain without a related course.",
      courseDeleteError: "The course could not be removed.",
    },
    tr: {
      customize: "Çalışma alanını özelleştir",
      learningStyle: "Öğrenme stilin:",
      todayCenter: "Bugünün çalışma merkezi",
      nextUp: "Sıradaki blok",
      setPace: "Bugünün temposunu sen belirle.",
      planHint: "Açık görevlerini, hedefini ve uygun saatlerini kullanarak onaylayabileceğin bir çalışma planı oluştur.",
      planDay: "AI ile günümü planla",
      startFocus: "Odaklanmaya başla",
      openTasks: "açık görev",
      scheduled: "dk takvimde",
      addExam: "Sınav ekle",
      today: "bugün",
      daysLeft: "gün kaldı",
      examCountdown: "sınav geri sayımı",
      lastSevenDays: "Son 7 gün",
      sessions: "oturum",
      overdueTasks: "gecikmiş görev",
      todaysPlan: "Bugünün planı",
      generating: "Oluşturuluyor…",
      draftTitle: "AI çalışma planı taslağı",
      draftHint: "Kaydetmeden önce her öneriyi kontrol edip düzenleyebilirsin.",
      saveDraft: "AI çalışma planıma kaydet",
      planTask: "Plan görevi",
      removeSuggestion: "Öneriyi sil",
      goalTitle: "Günlük odak hedefin",
      goalDescription: "Bu hedef yalnızca çalışma planını ve ilerleme kartını kişiselleştirir; üyelik veya ödemeyi etkilemez.",
      minutesPerDay: "Dakika / gün",
      cancel: "Vazgeç",
      saving: "Kaydediliyor…",
      saveGoal: "Hedefi kaydet",
      savePlanError: "Plan, AI çalışma planına kaydedilemedi.",
      saveGoalError: "Günlük hedef kaydedilemedi. Lütfen tekrar dene.",
      noOpenTasks: "Bugün için açık görevin yok.",
      courseLimit: "Ücretsiz planda en fazla 2 ders bulunabilir. Sınırsız ders için planını yükselt.",
      duplicateCourse: "Bu ders zaten listende bulunuyor.",
      courseSaveError: "Ders kaydedilemedi.",
      deleteCourseConfirm: "Bu ders kaldırılsın mı? Mevcut görevler ilişkili ders olmadan korunur.",
      courseDeleteError: "Ders kaldırılamadı.",
    },
    es: {
      customize: "Personalizar espacio",
      learningStyle: "Estilo de aprendizaje:",
      todayCenter: "Resumen de hoy",
      nextUp: "Siguiente bloque",
      setPace: "Marca el ritmo de tu día.",
      planHint: "Usa tus tareas, meta y horas disponibles para crear un plan que puedas revisar antes de guardarlo.",
      planDay: "Planificar mi día con IA",
      startFocus: "Iniciar enfoque",
      openTasks: "tareas abiertas",
      scheduled: "min programados",
      addExam: "Añadir examen",
      today: "hoy",
      daysLeft: "días restantes",
      examCountdown: "cuenta atrás del examen",
      lastSevenDays: "Últimos 7 días",
      sessions: "sesiones",
      overdueTasks: "tareas atrasadas",
      todaysPlan: "Plan de hoy",
      generating: "Generando…",
      draftTitle: "Borrador del plan de IA",
      draftHint: "Revisa y edita cada sugerencia antes de guardarla.",
      saveDraft: "Guardar en el plan de IA",
      planTask: "Tarea del plan",
      removeSuggestion: "Eliminar sugerencia",
      goalTitle: "Tu meta diaria de enfoque",
      goalDescription: "Personaliza tu plan y progreso; no afecta a la suscripción ni a los pagos.",
      minutesPerDay: "Minutos al día",
      cancel: "Cancelar",
      saving: "Guardando…",
      saveGoal: "Guardar meta",
      savePlanError: "No se pudo guardar el plan de estudio con IA.",
      saveGoalError: "No se pudo guardar tu meta diaria. Inténtalo de nuevo.",
      noOpenTasks: "No tienes tareas abiertas para hoy.",
      courseLimit: "El plan Gratis admite hasta 2 cursos. Actualiza para tener cursos ilimitados.",
      duplicateCourse: "Este curso ya está en tu lista.",
      courseSaveError: "No se pudo guardar el curso.",
      deleteCourseConfirm: "¿Eliminar este curso? Las tareas existentes se conservarán sin curso relacionado.",
      courseDeleteError: "No se pudo eliminar el curso.",
    },
    zh: {
      customize: "自定义工作区",
      learningStyle: "学习方式：",
      todayCenter: "今日概览",
      nextUp: "下一安排",
      setPace: "按自己的节奏安排今天。",
      planHint: "根据待办任务、目标和可用时间生成计划，确认后再保存。",
      planDay: "使用 AI 规划今天",
      startFocus: "开始专注",
      openTasks: "项待办任务",
      scheduled: "分钟已安排",
      addExam: "添加考试",
      today: "今天",
      daysLeft: "天后考试",
      examCountdown: "考试倒计时",
      lastSevenDays: "最近 7 天",
      sessions: "次专注",
      overdueTasks: "项逾期任务",
      todaysPlan: "今日计划",
      generating: "正在生成…",
      draftTitle: "AI 学习计划草稿",
      draftHint: "保存前可检查并编辑每一条建议。",
      saveDraft: "保存到 AI 学习计划",
      planTask: "计划任务",
      removeSuggestion: "删除建议",
      goalTitle: "每日专注目标",
      goalDescription: "此目标只会个性化学习计划和进度，不影响订阅或付款。",
      minutesPerDay: "每天分钟数",
      cancel: "取消",
      saving: "正在保存…",
      saveGoal: "保存目标",
      savePlanError: "无法保存到 AI 学习计划。",
      saveGoalError: "无法保存每日目标，请重试。",
      noOpenTasks: "今天没有待办任务。",
      courseLimit: "免费版最多支持 2 门课程，升级后可添加无限课程。",
      duplicateCourse: "该课程已在列表中。",
      courseSaveError: "无法保存课程。",
      deleteCourseConfirm: "要移除此课程吗？现有任务会保留，但不再关联课程。",
      courseDeleteError: "无法移除课程。",
    },
  });

  const [courses, setCourses] = useState<any[]>([]);

  // Focus Timer States
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerType, setTimerType] = useState<"work" | "short" | "long">("work");
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(0);
  const [weeklyStudyMinutes, setWeeklyStudyMinutes] = useState(0);
  const [weeklySessionCount, setWeeklySessionCount] = useState(0);

  // Tasks loaded from Supabase
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [upcomingExam, setUpcomingExam] = useState<any | null>(null);

  const [showTrialEndedModal, setShowTrialEndedModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("60");
  const [savingGoal, setSavingGoal] = useState(false);

  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<Array<{ title: string; priority: string }>>([]);

  const generateFallbackTasks = (courseList: string[], language: string) => {
    if (courseList.length === 0) {
      const defaults = localized(language, {
        en: [
          "Solve practice math exam questions",
          "Review physics formulas and summary notes",
          "Read 20 pages of assigned literature",
        ],
        tr: [
          "Matematik deneme sınavı sorularını çöz",
          "Fizik formüllerini ve konu özetini tekrar et",
          "Edebiyat kitabından 20 sayfa oku",
        ],
        es: [
          "Resolver preguntas de práctica de matemáticas",
          "Repasar fórmulas y apuntes de física",
          "Leer 20 páginas de la lectura asignada",
        ],
        zh: [
          "完成数学模拟题",
          "复习物理公式与摘要笔记",
          "阅读指定文学作品 20 页",
        ],
      });
      return defaults.map((text, index) => ({
        id: Date.now() + index + 1,
        text,
        done: false,
        priority: index === 0 ? "high" : index === 1 ? "medium" : "low",
      }));
    }

    return courseList.slice(0, 3).map((name, idx) => {
      const texts: Record<string, string[]> = {
        tr: [
          `Detaylı ${name} konu anlatımı notlarını oku ve özet çıkar`,
          `${name} ünitesiyle ilgili 10 adet çalışma sorusu çöz`,
          `Gelecek ${name} quiz sınavı için kelime kartlarını gözden geçir`
        ],
        en: [
          `Review comprehensive ${name} lecture notes and draft summary`,
          `Solve 10 practice questions related to ${name} unit`,
          `Go through flashcards for the upcoming ${name} quiz`
        ],
        es: [
          `Repasar los apuntes de ${name} y preparar un resumen`,
          `Resolver 10 preguntas de práctica sobre ${name}`,
          `Repasar las tarjetas para la próxima prueba de ${name}`,
        ],
        zh: [
          `复习 ${name} 课堂笔记并整理摘要`,
          `完成 10 道 ${name} 练习题`,
          `复习即将进行的 ${name} 测验卡片`,
        ],
      };
      const list = texts[language] || texts.en;
      return {
        id: Date.now() + idx,
        text: list[idx % list.length],
        done: false,
        priority: idx === 0 ? "high" : idx === 1 ? "medium" : "low"
      };
    });
  };

  const handleGenerateSchedule = async () => {
    setGeneratingSchedule(true);
    try {
      const courseNames = courses.map(c => c.name);
      const response = await fetch("/api/tasks/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courses: courseNames,
          language: lang,
          dailyGoalMinutes: profile?.daily_study_goal_minutes || 60,
          completedFocusMinutes: totalStudyMinutes,
          existingTasks: tasks
            .filter((task) => !task.done)
            .map((task) => ({ title: task.text, priority: task.priority, dueDate: task.dueDate }))
        })
      });
      const data = await response.json();

      const rawTexts: string[] = (response.ok && data.tasks)
        ? data.tasks
        : generateFallbackTasks(courseNames, lang).map((t: any) => t.text);

      // Keep AI output as an explicit draft. The user decides whether it
      // belongs in the active task list.
      setScheduleDraft(rawTexts.map((text, idx) => ({
        title: text,
        priority: idx === 0 ? "high" : idx === 1 ? "medium" : "low",
      })));
    } catch (err) {
      const courseNames = courses.map(c => c.name);
      const fallbackTasks = generateFallbackTasks(courseNames, lang);
      setScheduleDraft(fallbackTasks.map((task: any) => ({ title: task.text, priority: task.priority })));
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const handleAcceptSchedule = async () => {
    if (!user || scheduleDraft.length === 0) return;
    const acceptedDraft = scheduleDraft.filter((draft) => draft.title.trim());
    if (acceptedDraft.length === 0) return;
    const rows = acceptedDraft.map((draft) => ({
      user_id: user.id,
      title: draft.title,
      priority: draft.priority,
      status: "todo",
      task_origin: "ai_schedule",
    }));
    const { data: inserted, error } = await supabase.from("tasks").insert(rows).select("*");
    if (error) {
      alert(dashboardCopy.savePlanError);
      return;
    }
    const newTasks = (inserted || rows).map((row: any, idx: number) => ({
      id: row.id || Date.now() + idx,
      text: row.title,
      done: false,
      priority: row.priority,
      taskOrigin: row.task_origin || "ai_schedule",
    }));
    setTasks((previous) => [...previous, ...newTasks]);
    setScheduleDraft([]);
    window.dispatchEvent(new CustomEvent("onpace-tasks-updated"));
    router.push("/tasks?view=study-plan");
  };

  const updateScheduleDraftTitle = (index: number, title: string) => {
    setScheduleDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title } : item));
  };

  const removeScheduleDraftItem = (index: number) => {
    setScheduleDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };


  // Parse User Customization Settings
  const customization = profile?.customization_settings || {
    layout: { streak: true, calendar: true, notes: true, timer: true, ai: true },
    widget_sizes: { streak: "medium", calendar: "large", notes: "medium", timer: "medium", ai: "large" }
  };
  const layoutConfig = customization.layout || {};
  const widgetSizes = customization.widget_sizes || {};

  const showStreak = layoutConfig.streak !== false;
  const showNotes = layoutConfig.notes !== false; // tasks
  const showTimer = layoutConfig.timer !== false;
  const showAi = layoutConfig.ai !== false;

  const getStreakSpan = () => {
    const size = widgetSizes.streak || "medium";
    if (size === "small") return "col-span-1";
    if (size === "large") return "col-span-full";
    return "md:col-span-2 col-span-1";
  };

  const getGoalsSpan = () => {
    const size = widgetSizes.streak || "medium";
    if (size === "small") return "col-span-1";
    if (size === "large") return "col-span-full";
    return "col-span-1";
  };

  const getNotesSpan = () => {
    if (!showTimer) return "col-span-full";
    if (widgetSizes.notes === "large") return "col-span-full";
    return "col-span-1";
  };

  const getTimerSpan = () => {
    if (!showNotes) return "col-span-full";
    if (widgetSizes.timer === "large") return "col-span-full";
    return "col-span-1";
  };

  // Course Management States
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);

  const addCourse = async (
    courseName: string,
    source: "catalog" | "custom" | "exam_suggestion" = "custom",
    catalogKey: string | null = null
  ) => {
    const normalizedName = courseName.trim().replace(/\s+/g, " ");
    if (!normalizedName) return;
    if (
      courses.some(
        (course) =>
          course.name.trim().toLocaleLowerCase() ===
          normalizedName.toLocaleLowerCase()
      )
    ) {
      alert(dashboardCopy.duplicateCourse);
      return;
    }

    // Limit check for Free plan: max 2 courses
    if (!isPro && courses.length >= 2) {
      alert(dashboardCopy.courseLimit);
      return;
    }

    setAddingCourse(true);
    const colors = ["#4F46E5", "#06B6D4", "#10B981", "#EF4444", "#F59E0B", "#EC4899", "#8B5CF6"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { data, error } = await supabase
      .from("courses")
      .insert([
        {
          user_id: profile.id,
          name: normalizedName,
          color: randomColor,
          course_source: source,
          catalog_key: catalogKey,
        }
      ])
      .select("*")
      .single();

    if (!error && data) {
      setCourses([...courses, data]);
      setNewCourseName("");
    } else {
      alert(error?.message || dashboardCopy.courseSaveError);
    }
    setAddingCourse(false);
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCourse(newCourseName);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm(dashboardCopy.deleteCourseConfirm)) return;
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) {
      alert(error.message || dashboardCopy.courseDeleteError);
      return;
    }
    setCourses(courses.filter(c => c.id !== courseId));
  };

  // Load User & Profile
  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileData && !profileData.has_onboarded) {
        router.push("/onboarding");
        return;
      }

      if (profileData) {
        setGoalDraft(String(profileData.daily_study_goal_minutes || 60));
        const now = new Date();
        const trialEnds = profileData.trial_ends_at ? new Date(profileData.trial_ends_at) : null;
        const isTrialActive = trialEnds && trialEnds > now;

        // Auto-downgrade when trialing but trial ends date is past
        if (profileData.subscription_status === "trialing" && !isTrialActive) {
          setShowTrialEndedModal(true);
          const updatedProfile = {
            ...profileData,
            subscription_status: "expired",
            plan: "free"
          };
          setProfile(updatedProfile);
          
          await supabase
            .from("profiles")
            .update({ subscription_status: "expired", plan: "free" })
            .eq("id", user.id);
        } else {
          setProfile(profileData);
        }
      }

      // Fetch user courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id);
      
      if (coursesData) setCourses(coursesData);

      // Load tasks from Supabase
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (tasksData) {
        setTasks(tasksData.map((t: any) => ({
          id: t.id,
          text: t.title,
          done: t.status === "completed",
          priority: t.priority,
          dueDate: t.due_date,
          taskOrigin: t.task_origin || "manual",
        })));
      }

      const startOfLocalToday = new Date();
      startOfLocalToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfLocalToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      const [todaySessionsResult, upcomingExamResult] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("id, title, start_time, end_time, duration, courses(name, color)")
          .eq("user_id", user.id)
          .gte("start_time", startOfLocalToday.toISOString())
          .lt("start_time", startOfTomorrow.toISOString())
          .order("start_time", { ascending: true }),
        supabase
          .from("exam_roadmaps")
          .select("id, title, exam_date, color")
          .eq("user_id", user.id)
          .gte("exam_date", startOfLocalToday.toISOString().slice(0, 10))
          .order("exam_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      if (todaySessionsResult.data) setTodaySessions(todaySessionsResult.data);
      if (upcomingExamResult.data) setUpcomingExam(upcomingExamResult.data);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: focusData } = await supabase
        .from("focus_sessions")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .eq("mode", "study")
        .gte("created_at", startOfToday.toISOString());

      if (focusData) {
        const loggedSeconds = focusData.reduce((total: number, session: any) => total + Number(session.duration_seconds || 0), 0);
        setTotalStudyMinutes(Math.floor(loggedSeconds / 60));
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const { data: weeklyFocusData } = await supabase
        .from("focus_sessions")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .eq("mode", "study")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (weeklyFocusData) {
        setWeeklySessionCount(weeklyFocusData.length);
        setWeeklyStudyMinutes(Math.floor(weeklyFocusData.reduce((total: number, session: any) => total + Number(session.duration_seconds || 0), 0) / 60));
      }

      setLoading(false);
    }
    getUserData();
  }, [router, supabase]);

  useEffect(() => {
    const refreshTodayCenter = async () => {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      if (!activeUser) return;

      const startOfLocalToday = new Date();
      startOfLocalToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfLocalToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      const [tasksResult, sessionsResult] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", activeUser.id).order("created_at", { ascending: false }),
        supabase
          .from("study_sessions")
          .select("id, title, start_time, end_time, duration, courses(name, color)")
          .eq("user_id", activeUser.id)
          .gte("start_time", startOfLocalToday.toISOString())
          .lt("start_time", startOfTomorrow.toISOString())
          .order("start_time", { ascending: true }),
      ]);
      if (tasksResult.data) {
        setTasks(tasksResult.data.map((task: any) => ({
          id: task.id,
          text: task.title,
          done: task.status === "completed",
          priority: task.priority,
          dueDate: task.due_date,
          taskOrigin: task.task_origin || "manual",
        })));
      }
      if (sessionsResult.data) setTodaySessions(sessionsResult.data);
    };

    window.addEventListener("onpace-calendar-updated", refreshTodayCenter);
    window.addEventListener("onpace-tasks-updated", refreshTodayCenter);
    return () => {
      window.removeEventListener("onpace-calendar-updated", refreshTodayCenter);
      window.removeEventListener("onpace-tasks-updated", refreshTodayCenter);
    };
  }, [supabase]);

  // Pomodoro Countdown Logic
  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        if (timerSeconds === 0) {
          if (timerMinutes === 0) {
            // Timer complete
            setTimerActive(false);
            if (timerType === "work" && user?.id) {
              void supabase
                .from("focus_sessions")
                .insert({ user_id: user.id, duration_seconds: 25 * 60, mode: "study", completed: true })
                .then(({ error }) => {
                  if (!error) {
                    setTotalStudyMinutes(prev => prev + 25);
                    setWeeklyStudyMinutes(prev => prev + 25);
                    setWeeklySessionCount(prev => prev + 1);
                  }
                });
            }
            alert(t.dashboard.timerComplete);
            resetTimer();
          } else {
            setTimerMinutes(timerMinutes - 1);
            setTimerSeconds(59);
          }
        } else {
          setTimerSeconds(timerSeconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerMinutes, timerSeconds, timerType, user?.id, supabase]);

  const selectTimer = (type: "work" | "short" | "long") => {
    setTimerType(type);
    setTimerActive(false);
    if (type === "work") {
      setTimerMinutes(25);
    } else if (type === "short") {
      setTimerMinutes(5);
    } else {
      setTimerMinutes(15);
    }
    setTimerSeconds(0);
  };

  const resetTimer = () => {
    setTimerActive(false);
    selectTimer(timerType);
  };

  const handleSaveDailyGoal = async () => {
    if (!profile?.id) return;
    const goal = Math.max(15, Math.min(480, Number.parseInt(goalDraft, 10) || 60));
    setSavingGoal(true);
    const { error } = await supabase
      .from("profiles")
      .update({ daily_study_goal_minutes: goal })
      .eq("id", profile.id);

    if (!error) {
      setProfile((current: any) => ({ ...current, daily_study_goal_minutes: goal }));
      setGoalDraft(String(goal));
      setShowGoalModal(false);
    } else {
      alert(dashboardCopy.saveGoalError);
    }
    setSavingGoal(false);
  };

  // Task Actions
  const handleToggleTask = async (id: any) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newDone = !task.done;
    // Optimistic update
    setTasks(tasks.map(t => t.id === id ? { ...t, done: newDone } : t));
    // Persist to Supabase
    await supabase
      .from("tasks")
      .update({ status: newDone ? "completed" : "todo", completed_at: newDone ? new Date().toISOString() : null })
      .eq("id", id);
    window.dispatchEvent(new CustomEvent("onpace-tasks-updated"));
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user) return;
    const title = newTaskText.trim();
    setNewTaskText("");
    // Insert into Supabase
    const { data: inserted } = await supabase
      .from("tasks")
      .insert({ user_id: user.id, title, priority: "medium", status: "todo", task_origin: "manual" })
      .select("*")
      .single();
    setTasks(prev => [
      { id: inserted?.id || Date.now(), text: title, done: false, priority: "medium", dueDate: inserted?.due_date || null, taskOrigin: "manual" },
      ...prev
    ]);
    window.dispatchEvent(new CustomEvent("onpace-tasks-updated"));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearRememberSessionIntent();
    window.location.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-secondary">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Pacing your schedule...</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnds && trialEnds > now;
  const isPro = profile?.plan === "pro" || profile?.plan === "founding" || isTrialActive;

  let trialDaysRemaining = 0;
  if (trialEnds && isTrialActive) {
    const diffTime = Math.abs(trialEnds.getTime() - now.getTime());
    trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const isAdmin = profile?.role === "admin";
  const dailyGoal = profile?.daily_study_goal_minutes || 60;

  const dateLocale = localeForLanguage(lang);
  const formattedDate = new Date().toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric' });

  const progressPercent = Math.min(Math.round((totalStudyMinutes / dailyGoal) * 100), 100);
  const remainingMinutes = Math.max(0, dailyGoal - totalStudyMinutes);
  const completedTaskCount = tasks.filter(
    (task) => task.done && task.taskOrigin !== "ai_schedule"
  ).length;
  const goalSummary = lang === "tr"
    ? (remainingMinutes > 0
      ? `Bugün ${totalStudyMinutes} dk odak çalışması kaydettin. Hedefe ulaşmak için ${remainingMinutes} dk kaldı.`
      : `Bugünkü ${dailyGoal} dk odak hedefini tamamladın. Harika iş!`)
    : lang === "es"
      ? (remainingMinutes > 0
        ? `Hoy registraste ${totalStudyMinutes} min de enfoque. Te faltan ${remainingMinutes} min para tu meta.`
        : `Completaste tu meta de enfoque de ${dailyGoal} min para hoy. ¡Buen trabajo!`)
      : lang === "zh"
        ? (remainingMinutes > 0
          ? `今天已记录 ${totalStudyMinutes} 分钟专注学习，还差 ${remainingMinutes} 分钟即可完成目标。`
          : `你已完成今天 ${dailyGoal} 分钟的专注目标，做得很棒！`)
        : (remainingMinutes > 0
          ? `You have logged ${totalStudyMinutes} minutes of focused study today. ${remainingMinutes} minutes remain.`
          : `You completed today's ${dailyGoal}-minute focus goal. Great work!`);
  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const nextTask = [...tasks]
    .filter((task) => !task.done && task.taskOrigin !== "ai_schedule")
    .sort((first, second) => {
      const firstDue = first.dueDate ? new Date(first.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const secondDue = second.dueDate ? new Date(second.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (firstDue !== secondDue) return firstDue - secondDue;
      return (priorityRank[first.priority] ?? 1) - (priorityRank[second.priority] ?? 1);
    })[0];
  const todayPlanRecommendation = localized(lang, {
    en: nextTask
      ? `Next task: “${nextTask.text}”. I can create a draft that uses your remaining ${remainingMinutes} minutes.`
      : `You have no open tasks today. I can create a starter draft around your courses and ${dailyGoal}-minute goal.`,
    tr: nextTask
      ? `Sıradaki görev: “${nextTask.text}”. Kalan ${remainingMinutes} dakikayı bu işe göre parçalara ayıran bir taslak oluşturabilirim.`
      : `Bugün için açık görevin yok. Derslerine ve ${dailyGoal} dakikalık hedefine göre başlangıç taslağı oluşturabilirim.`,
    es: nextTask
      ? `Siguiente tarea: «${nextTask.text}». Puedo crear un borrador para tus ${remainingMinutes} minutos restantes.`
      : `No tienes tareas abiertas. Puedo crear un borrador según tus cursos y tu meta de ${dailyGoal} minutos.`,
    zh: nextTask
      ? `下一项任务：“${nextTask.text}”。我可以根据剩余的 ${remainingMinutes} 分钟生成可编辑草稿。`
      : `今天没有待办任务。我可以根据课程和 ${dailyGoal} 分钟目标生成起始计划。`,
  });

  const orderedTasks = tasks
    .filter((task) => !task.done && task.taskOrigin !== "ai_schedule")
    .sort((a, b) => {
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (dueA !== dueB) return dueA - dueB;
      return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
    });
  const startOfTodayForTasks = new Date();
  startOfTodayForTasks.setHours(0, 0, 0, 0);
  const overdueTaskCount = orderedTasks.filter((task) => task.dueDate && new Date(task.dueDate) < startOfTodayForTasks).length;
  const nextScheduledSession = todaySessions.find((session) => {
    const endTime = session.end_time
      ? new Date(session.end_time).getTime()
      : new Date(session.start_time).getTime() + (Number(session.duration) || 60) * 60_000;
    return endTime > now.getTime();
  });
  const todaySessionMinutes = todaySessions.reduce(
    (total, session) => total + (Number(session.duration) || 60),
    0
  );
  const examDaysRemaining = upcomingExam
    ? Math.max(0, Math.ceil((new Date(`${upcomingExam.exam_date}T00:00:00`).getTime() - startOfTodayForTasks.getTime()) / 86_400_000))
    : null;
  const timeFormatter = new Intl.DateTimeFormat(dateLocale, { hour: "2-digit", minute: "2-digit" });

  // SVG parameters for progress ring
  const ringRadius = 50;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeOffset = ringCircumference - (progressPercent / 100) * ringCircumference;

  return (
    <main className="flex-1 p-6 lg:p-10 flex flex-col justify-between overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full space-y-8">
          
          {/* Top Mobile Bar */}
          <header className="flex items-center justify-between lg:hidden border-b border-gray-200 pb-4">
            <span className="text-xl font-bold tracking-tight text-brand">OnPace</span>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link href="/admin" className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
                  Admin
                </Link>
              )}
              <button onClick={handleSignOut} className="text-sm font-medium text-red-500 flex items-center gap-1">
                <LogOut size={16} />
              </button>
            </div>
          </header>

          {/* Welcome Dashboard Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark">
                {t.dashboard.howdy}, {profile?.full_name?.split(" ")[0] || "Student"}!
              </h1>
              <p className="text-sm text-gray-500 mt-1">{t.dashboard.todayIs} {formattedDate}. {t.dashboard.stayFocused}</p>
              {profile?.learning_styles && profile.learning_styles.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🧠 {dashboardCopy.learningStyle}</span>
                  <div className="flex flex-wrap gap-1">
                    {profile.learning_styles.map((style: string) => (
                      <span key={style} className="bg-brand/10 text-brand text-[10px] font-bold px-2 py-0.5 rounded-md border border-brand/20 uppercase">
                        {learningStyleNames[style]?.[lang] || style}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/customization"
                className="bg-white border border-gray-150 text-gray-600 hover:text-brand hover:border-brand/45 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Palette size={13} className="text-brand" />
                <span className="hidden sm:inline">{dashboardCopy.customize}</span>
              </Link>
              <span className="bg-white border border-gray-200 text-surface-dark px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                🔥 {profile?.streak_count || 0} {t.common.streak}
              </span>
              <Link
                href="/billing"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:ring-2 hover:ring-brand/15 ${isPro ? "bg-brand/10 text-brand" : "bg-gray-100 text-gray-500"}`}
              >
                {isPro ? (profile?.plan === "founding" ? t.common.foundingBadge : t.common.proBadge) : t.common.freeBadge}
              </Link>
            </div>
          </div>

          {/* Trial Remaining Alert Banner */}
          {isTrialActive && (
            <div className="bg-gradient-to-r from-brand to-brand-dark p-4.5 rounded-2xl text-white text-xs font-semibold shadow-sm flex items-center justify-between gap-4 animate-pulse">
              <span>💡 {t.dashboard.trialBanner.replace("{days}", String(trialDaysRemaining))}</span>
              <Link href="/billing" className="px-3.5 py-1.5 bg-white text-brand rounded-lg font-bold hover:bg-gray-50 transition-all active:scale-95 text-[10px]">
                {t.common.upgradeNow}
              </Link>
            </div>
          )}

          {/* Today Center: one actionable view of tasks, calendar, focus, and exams. */}
          <section className="overflow-hidden rounded-3xl border border-brand/15 bg-gradient-to-br from-brand/10 via-white to-indigo-50 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-brand shadow-sm">
                  <Sparkles size={13} /> {dashboardCopy.todayCenter}
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-surface-dark">
                  {nextScheduledSession
                    ? `${dashboardCopy.nextUp}: ${nextScheduledSession.title}`
                    : dashboardCopy.setPace}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
                  {nextScheduledSession
                    ? `${timeFormatter.format(new Date(nextScheduledSession.start_time))} · ${Number(nextScheduledSession.duration) || 60} ${t.common.minutes}${nextScheduledSession.courses?.name ? ` · ${nextScheduledSession.courses.name}` : ""}`
                    : dashboardCopy.planHint}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/calendar?plan=today"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95"
                >
                  <Sparkles size={15} /> {dashboardCopy.planDay}
                </Link>
                <Link
                  href="/focus"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand/20 bg-white px-4 py-3 text-xs font-bold text-brand transition-colors hover:bg-brand/5"
                >
                  <Timer size={15} /> {dashboardCopy.startFocus}
                </Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link href="/tasks" className="rounded-2xl border border-white bg-white/80 p-4 transition-colors hover:border-brand/25 hover:bg-white">
                <div className="flex items-center justify-between"><CheckSquare size={17} className="text-brand" /><ChevronRight size={15} className="text-gray-300" /></div>
                <p className="mt-3 text-2xl font-extrabold text-surface-dark">{orderedTasks.length}</p>
                <p className="text-xs font-semibold text-gray-500">{dashboardCopy.openTasks}</p>
              </Link>
              <Link href="/calendar" className="rounded-2xl border border-white bg-white/80 p-4 transition-colors hover:border-brand/25 hover:bg-white">
                <div className="flex items-center justify-between"><CalendarDays size={17} className="text-brand" /><ChevronRight size={15} className="text-gray-300" /></div>
                <p className="mt-3 text-2xl font-extrabold text-surface-dark">{todaySessions.length}</p>
                <p className="text-xs font-semibold text-gray-500">{todaySessionMinutes} {dashboardCopy.scheduled}</p>
              </Link>
              <Link href="/exam-planner" className="rounded-2xl border border-white bg-white/80 p-4 transition-colors hover:border-brand/25 hover:bg-white">
                <div className="flex items-center justify-between"><Award size={17} className="text-brand" /><ChevronRight size={15} className="text-gray-300" /></div>
                <p className="mt-3 truncate text-base font-extrabold text-surface-dark">{upcomingExam?.title || dashboardCopy.addExam}</p>
                <p className="text-xs font-semibold text-gray-500">{upcomingExam ? (examDaysRemaining === 0 ? dashboardCopy.today : `${examDaysRemaining} ${dashboardCopy.daysLeft}`) : dashboardCopy.examCountdown}</p>
              </Link>
            </div>
          </section>

          {/* Trial Expired Alert Modal */}
          {showTrialEndedModal && (
            <div className="fixed inset-0 bg-surface-dark/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-lg border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-surface-dark">{t.dashboard.trialEndedTitle}</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {t.dashboard.trialEndedDesc}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowTrialEndedModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-xs font-semibold rounded-xl hover:bg-gray-50 text-gray-500 transition-all cursor-pointer"
                  >
                    {t.dashboard.keepFree}
                  </button>
                  <Link
                    href="/billing"
                    className="flex-1 py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover text-center transition-all cursor-pointer flex items-center justify-center"
                  >
                    {t.dashboard.upgradeToPro}
                  </Link>
              </div>
            </div>
          </div>
        )}

          {/* Stats & Rings Panel */}
          {showStreak && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* SVG Progress Ring Card */}
              <div className={`bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex items-center gap-6 ${getStreakSpan()}`}>
                <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="56" cy="56" r={ringRadius} className="stroke-gray-100" strokeWidth="10" fill="transparent" />
                    <circle
                      cx="56"
                      cy="56"
                      r={ringRadius}
                      className="stroke-brand transition-all duration-500"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringStrokeOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-extrabold text-surface-dark">{progressPercent}%</span>
                    <p className="text-[10px] text-gray-400 font-medium">{dashboardCopy.today}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-surface-dark">{t.dashboard.goalProgress}</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-lg">{goalSummary}</p>
                  <button type="button" onClick={() => setShowGoalModal(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline mt-3">
                    {t.common.adjustGoal} <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Micro Goals Streak Card */}
              <div className={`bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between ${getGoalsSpan()}`}>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.dashboard.activeTargets}</h4>
                  <div className="space-y-3 mt-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{t.dashboard.tasksFinished}</span>
                      <span className="font-semibold text-surface-dark">{completedTaskCount} / {tasks.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{t.dashboard.goalMinutes}</span>
                      <span className="font-semibold text-surface-dark">{dailyGoal} {t.common.minutes}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{dashboardCopy.lastSevenDays}</span>
                      <span className="font-semibold text-surface-dark">{weeklyStudyMinutes} {t.common.minutes} · {weeklySessionCount} {dashboardCopy.sessions}</span>
                    </div>
                    {overdueTaskCount > 0 && (
                      <Link href="/tasks" className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">
                        <span>{overdueTaskCount} {dashboardCopy.overdueTasks}</span>
                        <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.dashboard.myCourses}</h4>
                      <button
                        onClick={() => setShowCoursesModal(true)}
                        className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
                      >
                        ⚙️ {t.common.manage}
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {courses.length === 0 ? (
                        <span className="text-xs text-gray-400">{t.dashboard.noCourses}</span>
                      ) : (
                        courses.map(course => (
                          <span
                            key={course.id}
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: course.color }}
                          >
                            {course.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Manage Courses Modal */}
                  {showCoursesModal && (
                    <div className="fixed inset-0 bg-surface-dark/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-lg border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <h3 className="font-extrabold text-sm text-surface-dark">{t.common.manage} {t.dashboard.myCourses}</h3>
                          <button
                            onClick={() => setShowCoursesModal(false)}
                            className="text-xs text-gray-400 hover:text-surface-dark transition-all cursor-pointer font-bold"
                          >
                            {t.common.close}
                          </button>
                        </div>

                        {/* Add Course Form */}
                        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-xl bg-gray-50 p-2">
                          {getSuggestedCourseCatalog(profile?.country).map((course) => {
                            const alreadyAdded = courses.some((item) => item.name.trim().toLocaleLowerCase() === course.name.toLocaleLowerCase());
                            return (
                              <button
                                key={course.key}
                                type="button"
                                disabled={addingCourse || alreadyAdded}
                                onClick={() => void addCourse(course.name, course.source, course.key)}
                                className="rounded-full border border-brand/15 bg-white px-2.5 py-1 text-[10px] font-bold text-brand disabled:opacity-40"
                              >
                                {alreadyAdded ? "✓ " : course.source === "exam_suggestion" ? "★ " : "+ "}
                                {getLocalizedCourseName(course.name, lang)}
                              </button>
                            );
                          })}
                        </div>
                        <form onSubmit={handleAddCourse} className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={newCourseName}
                            onChange={(e) => setNewCourseName(e.target.value)}
                            placeholder={lang === "tr" ? "Özel ders adı" : "Custom course name"}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                          />
                          <button
                            type="submit"
                            disabled={addingCourse}
                            className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover cursor-pointer active:scale-95 transition-all"
                          >
                            {addingCourse ? "..." : t.common.new}
                          </button>
                        </form>

                        {/* Course Limit Disclaimer */}
                        {!isPro && (
                          <p className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1.5 rounded-lg font-medium">
                            ⚠️ {t.common.freeBadge}: <strong>{courses.length}/2</strong>. {t.common.upgradeNow}
                          </p>
                        )}

                        {/* Existing Courses List */}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.dashboard.myCourses}</h4>
                          {courses.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2">{t.dashboard.noCourses}</p>
                          ) : (
                            courses.map(course => (
                              <div key={course.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl border border-gray-50">
                                <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: course.color }} />
                                  {getLocalizedCourseName(course.name, lang)}
                                </span>
                                <button
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="text-gray-400 hover:text-red-500 text-xs font-semibold transition-all cursor-pointer p-1"
                                >
                                  {t.common.delete}
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-gray-50 mt-4">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Award size={14} className="text-brand" /> {profile?.grade_level || "AP Exam Prep"} {t.dashboard.pathActive}.
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* Interactive Widgets Grid */}
          {(showNotes || showTimer) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Widget: Interactive Tasks */}
              {showNotes && (
                <div className={`bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 ${getNotesSpan()}`}>
                  <div className="flex justify-between items-center gap-3">
           <h2 className="text-xl font-extrabold text-surface-dark">{lang === "tr" ? "Bugünün Görevleri" : lang === "es" ? "Tareas de hoy" : lang === "zh" ? "今日任务" : "Today's Tasks"}</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-medium">{t.dashboard.clickToComplete}</span>
                      <Link href="/tasks" className="text-xs font-bold text-brand hover:text-brand-hover whitespace-nowrap">
                        {lang === "tr" ? "Tümünü gör" : lang === "zh" ? "查看全部" : lang === "es" ? "Ver todas" : "View all"} →
                      </Link>
                    </div>
                  </div>

                  <form onSubmit={handleAddTask} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      placeholder={t.dashboard.placeholderTask}
                      className="flex-1 px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-surface-dark"
                    />
                    <button
                      type="submit"
                      className="p-3 bg-brand text-white rounded-xl hover:bg-brand-hover shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={18} />
                    </button>
                  </form>

                  <div className="space-y-3">
                    {orderedTasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className="flex items-center justify-between p-3.5 border border-gray-50 hover:border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${task.done ? "bg-brand border-brand text-white" : "border-gray-300 bg-white"}`}>
                            {task.done && <CheckSquare className="h-3 w-3" />}
                          </div>
                          <span className={`text-sm font-medium ${task.done ? "line-through text-gray-400" : "text-surface-dark"}`}>
                            {task.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${task.priority === "high" ? "bg-red-50 text-red-500 border border-red-100" : task.priority === "medium" ? "bg-orange-50 text-orange-500 border border-orange-100" : "bg-gray-100 text-gray-500"}`}>
                            {task.priority}
                          </span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setTasks(prev => prev.filter(t => t.id !== task.id));
                              await supabase.from("tasks").delete().eq("id", task.id);
                              window.dispatchEvent(new CustomEvent("onpace-tasks-updated"));
                            }}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {orderedTasks.length > 5 && (
                    <Link href="/tasks" className="block text-center text-xs font-bold text-brand hover:text-brand-hover pt-1">
                      {lang === "tr" ? `+${orderedTasks.length - 5} görev daha` : lang === "zh" ? `还有 ${orderedTasks.length - 5} 个任务` : lang === "es" ? `+${orderedTasks.length - 5} tareas más` : `+${orderedTasks.length - 5} more tasks`}
                    </Link>
                  )}
                </div>
              )}

              {/* Widget: Live Pomodoro Focus Timer */}
              {showTimer && (
                <div className={`bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between ${getTimerSpan()}`}>
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-extrabold text-surface-dark">{t.dashboard.focusTimer}</h2>
                      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                        <button
                          onClick={() => selectTimer("work")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${timerType === "work" ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-brand"}`}
                        >
                          {t.focus.timer.study}
                        </button>
                        <button
                          onClick={() => selectTimer("short")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${timerType === "short" ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-brand"}`}
                        >
                          {t.focus.timer.break}
                        </button>
                      </div>
                    </div>

                    <div className="text-center py-6">
                      <p className="text-6xl font-extrabold tracking-tight text-surface-dark select-none">
                        {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
                      </p>
                      <p className="text-xs text-gray-400 uppercase tracking-widest mt-2">
                        {timerType === "work" ? `🧠 ${t.dashboard.timeToDeepWork}` : `☕ ${t.dashboard.takeABreak}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 mt-4">
                    <button
                      onClick={() => setTimerActive(!timerActive)}
                      className={`px-6 py-3 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-2 ${timerActive ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-brand text-white hover:bg-brand-hover"}`}
                    >
                      {timerActive ? (
                        <>
                          <Pause size={16} /> {t.dashboard.pauseSession}
                        </>
                      ) : (
                        <>
                          <Play size={16} fill="white" /> {t.dashboard.startSession}
                        </>
                      )}
                    </button>
                    <button
                      onClick={resetTimer}
                      className="p-3 bg-white border border-gray-200 text-gray-500 hover:text-brand rounded-xl hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* AI Recommendation Panel (Strictly visually identified) */}
          {showAi && (
            <div className={`relative overflow-hidden bg-gradient-to-tr from-brand/5 to-brand-light/20 border border-brand/10 p-6 sm:p-8 rounded-3xl ${widgetSizes.ai === "small" ? "col-span-1" : "col-span-full"}`}>
              {/* Overlay if Free account */}
              {!isPro && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 flex flex-col justify-center items-center p-6 text-center space-y-3">
                  <div className="h-10 w-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                    <Lock size={20} />
                  </div>
                  <h3 className="text-base font-bold text-surface-dark">{t.ai.title} ({t.common.proBadge})</h3>
                  <p className="text-xs text-gray-500 max-w-sm">{t.billing.trialExpiredDesc}</p>
                  <Link
                    href="/billing"
                    className="px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover shadow-sm transition-all active:scale-95"
                  >
                    {t.dashboard.upgradeToPro}
                  </Link>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand text-white">
                    <Sparkles size={12} /> {t.dashboard.aiTitle}
                  </span>
                  <h3 className="text-xl font-extrabold text-surface-dark">
                    {dashboardCopy.todaysPlan}
                  </h3>
                  <p className="text-sm text-gray-600 max-w-2xl">
                    {todayPlanRecommendation}
                  </p>
                </div>
                <button
                  onClick={handleGenerateSchedule}
                  disabled={generatingSchedule}
                  className="px-5 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {generatingSchedule ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {dashboardCopy.generating}
                    </>
                  ) : (
                    t.dashboard.generateSchedule
                  )}
                </button>
              </div>
              {scheduleDraft.length > 0 && (
                <div className="mt-5 rounded-2xl border border-brand/20 bg-white/80 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-surface-dark">{dashboardCopy.draftTitle}</p>
                      <p className="text-[11px] text-gray-500">{dashboardCopy.draftHint}</p>
                    </div>
                    <button type="button" onClick={handleAcceptSchedule} className="rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-hover">
                      {dashboardCopy.saveDraft}
                    </button>
                  </div>
                  <ul className="space-y-1.5">
                    {scheduleDraft.map((draft, index) => (
                      <li key={`${draft.title}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-surface-dark">
                        <input
                          value={draft.title}
                          onChange={(event) => updateScheduleDraftTitle(index, event.target.value)}
                          aria-label={dashboardCopy.planTask}
                          className="min-w-0 flex-1 bg-transparent outline-none focus:text-brand"
                        />
                        <span className="text-[10px] font-bold uppercase text-gray-400">{draft.priority}</span>
                        <button type="button" onClick={() => removeScheduleDraftItem(index)} className="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500" aria-label={dashboardCopy.removeSuggestion}>
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-extrabold text-surface-dark">{dashboardCopy.goalTitle}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{dashboardCopy.goalDescription}</p>
                </div>
                <button type="button" onClick={() => setShowGoalModal(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100" aria-label="Close">×</button>
              </div>
              <div className="mt-6">
                <label htmlFor="daily-goal" className="text-xs font-bold uppercase tracking-wide text-gray-500">{dashboardCopy.minutesPerDay}</label>
                <input id="daily-goal" type="number" min={15} max={480} step={5} value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-bold text-surface-dark outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[30, 60, 90, 120].map((minutes) => (
                    <button key={minutes} type="button" onClick={() => setGoalDraft(String(minutes))} className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${Number(goalDraft) === minutes ? "border-brand bg-brand/10 text-brand" : "border-gray-200 text-gray-600 hover:border-brand/40"}`}>{minutes} {t.common.minutes}</button>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowGoalModal(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50">{dashboardCopy.cancel}</button>
                <button type="button" disabled={savingGoal} onClick={handleSaveDailyGoal} className="flex-1 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60">{savingGoal ? dashboardCopy.saving : dashboardCopy.saveGoal}</button>
              </div>
            </div>
          </div>
        )}

      </main>
  );
}
