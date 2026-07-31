"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CheckSquare,
  Plus,
  Loader2,
  Trash2,
  Calendar,
  AlertCircle,
  Tag,
  Clock,
  Sparkles,
  Award,
  CornerDownRight,
  GitCommit,
  Lock,
  HelpCircle,
  Settings2
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { getLocalizedCourseName, getSuggestedCourseCatalog } from "@/lib/course-labels";
import { localeForLanguage, localized, normalizeLanguage } from "@/lib/i18n";

function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [estMinutes, setEstMinutes] = useState("30");
  const [dueDate, setDueDate] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Loading indicator for task breakdown
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);

  // Custom premium modal popup
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [customAlert, setCustomAlert] = useState<string | null>(null);
  const [showCourseManager, setShowCourseManager] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [savingCourse, setSavingCourse] = useState(false);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);
  const activeView = searchParams.get("view") === "study-plan" ? "study-plan" : "tasks";
  const viewCopies: Record<string, {
    tasks: string;
    studyPlan: string;
    studyPlanTitle: string;
    studyPlanHint: string;
    studyPlanEmpty: string;
    aiGenerated: string;
  }> = {
    en: {
      tasks: "My Tasks",
      studyPlan: "AI Study Plan",
      studyPlanTitle: "AI Study Plan",
      studyPlanHint: "AI-generated suggestions are kept separate from the tasks you created.",
      studyPlanEmpty: "Your AI study plan is empty. Generate a plan from the dashboard.",
      aiGenerated: "AI generated",
    },
    tr: {
      tasks: "Görevlerim",
      studyPlan: "AI Çalışma Planı",
      studyPlanTitle: "AI Çalışma Planı",
      studyPlanHint: "AI tarafından oluşturulan öneriler, kendi eklediğiniz görevlerden ayrı tutulur.",
      studyPlanEmpty: "AI çalışma planınız boş. Panelden yeni bir plan oluşturabilirsiniz.",
      aiGenerated: "AI tarafından oluşturuldu",
    },
    es: {
      tasks: "Mis tareas",
      studyPlan: "Plan de estudio con IA",
      studyPlanTitle: "Plan de estudio con IA",
      studyPlanHint: "Las sugerencias de IA se mantienen separadas de las tareas que creaste.",
      studyPlanEmpty: "Tu plan de estudio con IA está vacío. Genera uno desde el panel.",
      aiGenerated: "Generado por IA",
    },
    zh: {
      tasks: "我的任务",
      studyPlan: "AI 学习计划",
      studyPlanTitle: "AI 学习计划",
      studyPlanHint: "AI 生成的建议与您自己创建的任务分开显示。",
      studyPlanEmpty: "AI 学习计划为空。请从工作台生成计划。",
      aiGenerated: "AI 生成",
    },
  };
  const viewCopy = viewCopies[lang] || viewCopies.en;
  const taskCopy = localized(lang, {
    en: {
      manageCourses: "Manage courses",
      courseHint: "Add a suggested subject or enter your own course name.",
      customCourse: "Custom course name",
      addCourse: "Add course",
      suggested: "Suggested subjects",
      duplicateCourse: "This course is already in your list.",
      freeLimit: "The Free plan supports up to 2 courses. Upgrade for unlimited courses.",
      courseError: "The course could not be saved.",
      deleteCourse: "Remove course",
      deleteConfirm: "Remove this course? Existing tasks will remain without a related course.",
      deleteError: "The course could not be removed.",
      breakdownError: "AI could not break down this task. Please try again.",
      high: "High 🔴",
      medium: "Medium 🟡",
      low: "Low 🟢",
      dueLabel: "Due",
      finishedLabel: "Finished",
      clearCompleted: "Clear completed",
      premiumTitle: "Unlock Premium Features",
      premiumDescription: "Free accounts support up to 6 active tasks. Upgrade to Pro for AI task breakdown and unlimited study tools.",
      upgrade: "Upgrade to Pro",
      notification: "Notification",
      dismiss: "Dismiss",
    },
    tr: {
      manageCourses: "Dersleri yönet",
      courseHint: "Önerilen bir ders seç veya kendi ders adını yaz.",
      customCourse: "Özel ders adı",
      addCourse: "Ders ekle",
      suggested: "Önerilen dersler",
      duplicateCourse: "Bu ders zaten listende bulunuyor.",
      freeLimit: "Ücretsiz planda en fazla 2 ders bulunabilir. Sınırsız ders için planını yükselt.",
      courseError: "Ders kaydedilemedi.",
      deleteCourse: "Dersi kaldır",
      deleteConfirm: "Bu ders kaldırılsın mı? Mevcut görevler ilişkili ders olmadan korunur.",
      deleteError: "Ders kaldırılamadı.",
      breakdownError: "AI bu görevi alt adımlara bölemedi. Lütfen tekrar dene.",
      high: "Yüksek 🔴",
      medium: "Orta 🟡",
      low: "Düşük 🟢",
      dueLabel: "Bitiş",
      finishedLabel: "Tamamlandı",
      clearCompleted: "Tamamlananları temizle",
      premiumTitle: "Premium özellikleri aç",
      premiumDescription: "Ücretsiz hesaplarda en fazla 6 aktif görev bulunabilir. AI görev ayrıştırma ve sınırsız araçlar için Pro’ya yükselt.",
      upgrade: "Pro’ya yükselt",
      notification: "Bildirim",
      dismiss: "Kapat",
    },
    es: {
      manageCourses: "Gestionar cursos",
      courseHint: "Elige una materia sugerida o escribe el nombre de tu curso.",
      customCourse: "Nombre de curso personalizado",
      addCourse: "Añadir curso",
      suggested: "Materias sugeridas",
      duplicateCourse: "Este curso ya está en tu lista.",
      freeLimit: "El plan Gratis admite hasta 2 cursos. Actualiza para tener cursos ilimitados.",
      courseError: "No se pudo guardar el curso.",
      deleteCourse: "Eliminar curso",
      deleteConfirm: "¿Eliminar este curso? Las tareas existentes se conservarán sin curso relacionado.",
      deleteError: "No se pudo eliminar el curso.",
      breakdownError: "La IA no pudo dividir esta tarea. Inténtalo de nuevo.",
      high: "Alta 🔴",
      medium: "Media 🟡",
      low: "Baja 🟢",
      dueLabel: "Vence",
      finishedLabel: "Completado",
      clearCompleted: "Limpiar completadas",
      premiumTitle: "Desbloquear funciones Premium",
      premiumDescription: "Las cuentas Gratis admiten hasta 6 tareas activas. Actualiza a Pro para usar la división por IA y herramientas ilimitadas.",
      upgrade: "Actualizar a Pro",
      notification: "Aviso",
      dismiss: "Cerrar",
    },
    zh: {
      manageCourses: "管理课程",
      courseHint: "选择推荐科目或输入自己的课程名称。",
      customCourse: "自定义课程名称",
      addCourse: "添加课程",
      suggested: "推荐科目",
      duplicateCourse: "该课程已在列表中。",
      freeLimit: "免费版最多支持 2 门课程，升级后可添加无限课程。",
      courseError: "无法保存课程。",
      deleteCourse: "移除课程",
      deleteConfirm: "要移除此课程吗？现有任务会保留，但不再关联课程。",
      deleteError: "无法移除课程。",
      breakdownError: "AI 无法拆分此任务，请重试。",
      high: "高 🔴",
      medium: "中 🟡",
      low: "低 🟢",
      dueLabel: "截止日期",
      finishedLabel: "完成于",
      clearCompleted: "清除已完成",
      premiumTitle: "解锁高级学习工具",
      premiumDescription: "免费账户最多支持 6 项活动任务。升级 Pro 后可使用 AI 任务拆分和无限学习工具。",
      upgrade: "升级至 Pro",
      notification: "系统提示",
      dismiss: "关闭",
    },
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Fetch courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id);
      if (coursesData) setCourses(coursesData);

      // Fetch tasks (both parent and subtasks)
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*, courses(name, color)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (tasksData) setTasks(tasksData);

      setLoading(false);
    }
    loadData();
  }, [router, supabase]);

  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnds && trialEnds > now;
  const isPro = profile?.plan === "pro" || profile?.plan === "founding" || isTrialActive;

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Check task limitations for Free plan
    const nonCompletedCount = tasks.filter(
      task =>
        task.status !== "completed" &&
        !task.parent_id &&
        task.task_origin !== "ai_schedule"
    ).length;
    if (!isPro && nonCompletedCount >= 6) {
      setPremiumModalOpen(true);
      return;
    }

    setAddingTask(true);

    const newTask = {
      user_id: profile.id,
      course_id: courseId || null,
      title: title.trim(),
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      status: "todo",
      task_origin: "manual",
      estimated_minutes: parseInt(estMinutes),
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert([newTask])
      .select("*, courses(name, color)")
      .single();

    if (!error && data) {
      setTasks([data, ...tasks]);
      setTitle("");
      setCourseId("");
      setDueDate("");
      setPriority("medium");
      setEstMinutes("30");
    } else {
      setCustomAlert(t.common.errorOccurred || "An error occurred while adding this task.");
    }
    setAddingTask(false);
  };

  const handleToggleTaskStatus = async (task: any) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    const completedAt = nextStatus === "completed" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus, completed_at: completedAt })
      .eq("id", task.id);

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus, completed_at: completedAt } : t));
    }
  };

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id && t.parent_id !== id));
    }
  };

  const handleDeleteCompletedTasks = async () => {
    if (!profile?.id || completedTasks.length === 0) return;
    const confirmed = window.confirm(
      lang === "tr"
        ? `${completedTasks.length} tamamlanan görevi silmek istediğinize emin misiniz?`
        : lang === "zh"
          ? `确定删除 ${completedTasks.length} 个已完成任务吗？`
          : lang === "es"
            ? `¿Eliminar ${completedTasks.length} tareas completadas?`
            : `Delete ${completedTasks.length} completed tasks?`
    );
    if (!confirmed) return;

    const completedIds = completedTasks.map((task) => task.id);
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", profile.id)
      .in("id", completedIds);
    if (error) {
      setCustomAlert(error.message);
      return;
    }
    const completedIdSet = new Set(completedIds);
    setTasks((current) => current.filter((task) => !completedIdSet.has(task.id)));
  };

  const handleAddCourse = async (
    courseName = newCourseName,
    source: "catalog" | "custom" | "exam_suggestion" = "custom",
    catalogKey: string | null = null
  ) => {
    const normalizedName = courseName.trim().replace(/\s+/g, " ");
    if (!normalizedName || !profile?.id) return;
    if (
      courses.some(
        (course) =>
          course.name.trim().toLocaleLowerCase() ===
          normalizedName.toLocaleLowerCase()
      )
    ) {
      setCustomAlert(taskCopy.duplicateCourse);
      return;
    }
    if (!isPro && courses.length >= 2) {
      setCustomAlert(taskCopy.freeLimit);
      return;
    }

    setSavingCourse(true);
    const colors = ["#4F46E5", "#06B6D4", "#10B981", "#EF4444", "#F59E0B", "#EC4899", "#8B5CF6"];
    const { data, error } = await supabase
      .from("courses")
      .insert({
        user_id: profile.id,
        name: normalizedName,
        color: colors[courses.length % colors.length],
        course_source: source,
        catalog_key: catalogKey,
      })
      .select("*")
      .single();

    if (error || !data) {
      setCustomAlert(error?.message || taskCopy.courseError);
    } else {
      setCourses((current) => [...current, data]);
      setCourseId(data.id);
      setNewCourseName("");
    }
    setSavingCourse(false);
  };

  const handleDeleteCourse = async (course: any) => {
    if (!window.confirm(taskCopy.deleteConfirm)) return;
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) {
      setCustomAlert(error.message || taskCopy.deleteError);
      return;
    }
    setCourses((current) => current.filter((item) => item.id !== course.id));
    if (courseId === course.id) setCourseId("");
  };

  const handleBreakdownTask = async (task: any) => {
    if (!isPro) {
      setPremiumModalOpen(true);
      return;
    }

    setBreakingDownId(task.id);
    try {
      const response = await fetch("/api/tasks/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          language: normalizeLanguage(lang),
          regenerate: tasks.some((item) => item.parent_id === task.id),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.code === "BREAKDOWN_FAILED"
            ? taskCopy.breakdownError
            : payload?.error || taskCopy.breakdownError
        );
      }
      const subtasks = payload.subtasks;

      if (Array.isArray(subtasks)) {
        setTasks((current) => [
          ...subtasks,
          ...current.filter((item) => item.parent_id !== task.id),
        ]);
      }
    } catch (err) {
      console.error(err);
      setCustomAlert(err instanceof Error ? err.message : taskCopy.breakdownError);
    } finally {
      setBreakingDownId(null);
    }
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

  // Filter main level tasks (excluding subtasks)
  const mainTasks = tasks.filter(t => !t.parent_id);
  const studentTasks = mainTasks.filter(t => t.task_origin !== "ai_schedule");
  const studyPlanTasks = mainTasks.filter(t => t.task_origin === "ai_schedule");
  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortTasks = (items: any[]) => [...items].sort((a, b) => {
    const dueA = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const dueB = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    if (dueA !== dueB) return dueA - dueB;
    const priorityDifference = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });
  const visibleMainTasks = activeView === "study-plan" ? studyPlanTasks : studentTasks;
  const mainTodoTasks = sortTasks(visibleMainTasks.filter(t => t.status !== "completed"));
  const completedTasks = sortTasks(visibleMainTasks.filter(t => t.status === "completed"));

  const getSubtasksFor = (parentId: string) => {
    return tasks.filter(t => t.parent_id === parentId);
  };

  return (
    <main className="flex-1 p-6 lg:p-10 overflow-y-auto space-y-8 max-w-6xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
            <CheckSquare className="text-brand" /> {t.tasks.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.tasks.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Create Task Form */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5 sm:p-6 space-y-5 h-fit">
          <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2 border-b border-gray-100 pb-3">
            <Plus size={18} className="text-brand" /> {t.tasks.newAssignment}
          </h2>

          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label htmlFor="taskTitle" className="block text-xs font-bold text-gray-500 uppercase">{t.tasks.taskTitle}</label>
              <input
                id="taskTitle"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.tasks.placeholderTitle}
                className="block w-full mt-1.5 px-3 py-3 border border-gray-150 rounded-xl text-sm bg-white text-surface-dark placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="course" className="block text-xs font-bold text-gray-500 uppercase">{t.tasks.relatedCourse}</label>
                <button
                  type="button"
                  onClick={() => setShowCourseManager(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-brand hover:underline"
                >
                  <Settings2 size={12} /> {taskCopy.manageCourses}
                </button>
              </div>
              <select
                id="course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="block w-full mt-1.5 px-3 py-3 border border-gray-150 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-surface-dark bg-white cursor-pointer"
              >
                <option value="">{t.tasks.general}</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{getLocalizedCourseName(course.name, lang)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-xs font-bold text-gray-500 uppercase">{t.tasks.priority}</label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="block w-full mt-1.5 px-3 py-3 border border-gray-150 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-surface-dark bg-white cursor-pointer"
                >
                  <option value="high">{taskCopy.high}</option>
                  <option value="medium">{taskCopy.medium}</option>
                  <option value="low">{taskCopy.low}</option>
                </select>
              </div>
              <div>
                <label htmlFor="duration" className="block text-xs font-bold text-gray-500 uppercase">{t.tasks.estMins}</label>
                <select
                  id="duration"
                  value={estMinutes}
                  onChange={(e) => setEstMinutes(e.target.value)}
                  className="block w-full mt-1.5 px-3 py-3 border border-gray-150 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-surface-dark bg-white cursor-pointer"
                >
                  <option value="15">15 {t.common.minutes}</option>
                  <option value="30">30 {t.common.minutes}</option>
                  <option value="45">45 {t.common.minutes}</option>
                  <option value="60">60 {t.common.minutes}</option>
                  <option value="120">120 {t.common.minutes}</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-xs font-bold text-gray-500 uppercase">{t.tasks.dueDate}</label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="block w-full mt-1.5 px-3 py-3 border border-gray-150 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all text-surface-dark bg-white cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={addingTask}
                className="w-full py-3 rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-hover shadow-sm active:scale-95 transition-all cursor-pointer flex justify-center items-center gap-2"
              >
                {addingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                {t.tasks.addTask}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Tasks Play Desk */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-gray-100 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => router.replace("/tasks")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeView === "tasks"
                  ? "bg-white text-brand shadow-sm"
                  : "text-gray-500 hover:text-surface-dark"
              }`}
            >
              {viewCopy.tasks} ({studentTasks.filter(task => task.status !== "completed").length})
            </button>
            <button
              type="button"
              onClick={() => router.replace("/tasks?view=study-plan")}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeView === "study-plan"
                  ? "bg-white text-brand shadow-sm"
                  : "text-gray-500 hover:text-surface-dark"
              }`}
            >
              <Sparkles size={13} />
              {viewCopy.studyPlan} ({studyPlanTasks.filter(task => task.status !== "completed").length})
            </button>
          </div>
          
          {/* Active Tasks list */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-4 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-surface-dark">
                {activeView === "study-plan" ? viewCopy.studyPlanTitle : t.tasks.tasksTodo} ({mainTodoTasks.length})
              </h2>
              {activeView === "study-plan" && (
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{viewCopy.studyPlanHint}</p>
              )}
            </div>
            
            <div className="space-y-4">
              {mainTodoTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {activeView === "study-plan" ? viewCopy.studyPlanEmpty : t.tasks.allCompleted}
                </p>
              ) : (
                mainTodoTasks.map(task => {
                  const subtasks = getSubtasksFor(task.id);
                  const hasSubtasks = subtasks.length > 0;
                  const completedSubtasks = subtasks.filter(s => s.status === "completed").length;
                  
                  return (
                    <div key={task.id} className="space-y-2 border border-gray-50 p-4 rounded-2xl bg-white hover:border-gray-100 transition-all shadow-sm">
                      
                      {/* Main Task Row */}
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            className="h-5 w-5 mt-1 sm:mt-0 rounded-md border border-gray-300 hover:border-brand flex items-center justify-center bg-white cursor-pointer shrink-0"
                          />
                          <div>
                            <p className="text-sm font-semibold text-surface-dark">{task.title}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                              {task.courses && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.courses.color }}></span>
                                  {getLocalizedCourseName(task.courses.name, lang)}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} /> {taskCopy.dueLabel}:{" "}
                                  {new Date(task.due_date).toLocaleDateString(localeForLanguage(lang))}
                                </span>
                              )}
                              <span className="flex items-center gap-1"><Clock size={12} /> {task.estimated_minutes}{t.common.minutes}</span>
                              {task.task_origin === "ai_schedule" && (
                                <span className="flex items-center gap-1 font-semibold text-brand">
                                  <Sparkles size={12} /> {viewCopy.aiGenerated}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${task.priority === "high" ? "bg-red-50 text-red-500 border border-red-100" : task.priority === "medium" ? "bg-orange-50 text-orange-500 border border-orange-100" : "bg-gray-100 text-gray-500"}`}>
                            {task.priority === "high"
                              ? taskCopy.high
                              : task.priority === "medium"
                                ? taskCopy.medium
                                : taskCopy.low}
                          </span>
                          
                          {/* AI Breakdown Button (Locked if Free) */}
                          <button
                            disabled={breakingDownId !== null}
                            onClick={() => handleBreakdownTask(task)}
                            className={`p-1.5 border rounded-xl cursor-pointer active:scale-95 transition-all text-xs font-semibold flex items-center gap-1 ${
                              isPro 
                                ? "border-gray-150 hover:border-brand text-gray-500 hover:text-brand"
                                : "border-gray-150 text-gray-400 bg-gray-50"
                            }`}
                            title="AI Task Breakdown"
                          >
                            {breakingDownId === task.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : !isPro ? (
                              <Lock size={10} className="text-gray-400" />
                            ) : (
                              <Sparkles size={12} />
                            )}
                            <span className="hidden sm:inline">{t.tasks.aiBreakdown}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Sub-tasks Section */}
                      {hasSubtasks && (
                        <div className="pl-6 border-l-2 border-gray-100 space-y-2 mt-2">
                          <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                            <span>{t.tasks.aiSubtasks}</span>
                            <span>{completedSubtasks}/{subtasks.length} {t.tasks.completed}</span>
                          </div>
                          
                          {subtasks.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleTaskStatus(sub)}
                                  className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center cursor-pointer shrink-0 ${
                                    sub.status === "completed" 
                                      ? "bg-brand border-brand text-white" 
                                      : "border-gray-300 hover:border-brand bg-white"
                                  }`}
                                >
                                  {sub.status === "completed" && <CheckSquare className="h-3 w-3" />}
                                </button>
                                <span className={`text-xs ${
                                  sub.status === "completed" 
                                    ? "text-gray-400 line-through font-medium" 
                                    : "text-gray-700 font-semibold"
                                }`}>
                                  {sub.title}
                                </span>
                              </div>
                              
                              <button
                                onClick={() => handleDeleteTask(sub.id)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded-md cursor-pointer transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Completed Tasks list */}
          {completedTasks.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-500">{t.tasks.completed} ({completedTasks.length})</h2>
                <button
                  type="button"
                  onClick={handleDeleteCompletedTasks}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-2 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                  {taskCopy.clearCompleted}
                </button>
              </div>
              
              <div className="space-y-3 opacity-60">
                {completedTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border border-gray-50 rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className="h-5 w-5 rounded-md bg-brand border border-brand text-white flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <CheckSquare className="h-3 w-3" />
                      </button>
                      <div>
                        <p className="text-sm font-medium text-gray-500 line-through">{task.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {taskCopy.finishedLabel}:{" "}
                          {new Date(task.completed_at || "").toLocaleDateString(localeForLanguage(lang))}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {showCourseManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-surface-dark">{taskCopy.manageCourses}</h3>
                <p className="mt-1 text-xs text-gray-500">{taskCopy.courseHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCourseManager(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                aria-label={t.common.close}
              >
                ×
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{taskCopy.suggested}</p>
              <div className="flex flex-wrap gap-2">
                {getSuggestedCourseCatalog(profile?.country).map((course) => {
                  const alreadyAdded = courses.some(
                    (item) => item.name.trim().toLocaleLowerCase() === course.name.toLocaleLowerCase()
                  );
                  return (
                    <button
                      key={course.key}
                      type="button"
                      disabled={savingCourse || alreadyAdded}
                      onClick={() => void handleAddCourse(course.name, course.source, course.key)}
                      className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand hover:border-brand/35 disabled:cursor-default disabled:opacity-40"
                    >
                      {alreadyAdded ? "✓ " : "+ "}
                      {course.source === "exam_suggestion" ? "★ " : ""}
                      {getLocalizedCourseName(course.name, lang)}
                    </button>
                  );
                })}
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleAddCourse();
              }}
              className="flex gap-2"
            >
              <input
                required
                maxLength={100}
                value={newCourseName}
                onChange={(event) => setNewCourseName(event.target.value)}
                placeholder={taskCopy.customCourse}
                className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-surface-dark outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={savingCourse || !newCourseName.trim()}
                className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {savingCourse ? <Loader2 size={15} className="animate-spin" /> : taskCopy.addCourse}
              </button>
            </form>

            <div className="max-h-56 space-y-2 overflow-y-auto">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-bold text-surface-dark">
                    {getLocalizedCourseName(course.name, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCourse(course)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50"
                    aria-label={`${taskCopy.deleteCourse}: ${course.name}`}
                  >
                    <Trash2 size={12} /> {taskCopy.deleteCourse}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Premium Upgrade Modal Popup */}
      {premiumModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <Lock size={22} />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-surface-dark">
                {taskCopy.premiumTitle}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {taskCopy.premiumDescription}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setPremiumModalOpen(false);
                  router.push("/billing");
                }}
                className="w-full py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                🚀 {taskCopy.upgrade}
              </button>
              <button
                onClick={() => setPremiumModalOpen(false)}
                className="w-full py-2.5 bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal Dialog */}
      {customAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-brand-light text-brand flex items-center justify-center mx-auto shadow-sm">
              <HelpCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-dark">{taskCopy.notification}</h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
            >
              {taskCopy.dismiss}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-surface-secondary">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
