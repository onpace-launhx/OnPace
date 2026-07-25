"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  HelpCircle
} from "lucide-react";
import { getTranslations } from "@/lib/translations";
import { getLocalizedCourseName } from "@/lib/course-labels";

export default function TasksPage() {
  const router = useRouter();
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

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

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
    const nonCompletedCount = tasks.filter(task => task.status !== "completed" && !task.parent_id).length;
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

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", profile.id)
      .eq("status", "completed");
    if (error) {
      setCustomAlert(error.message);
      return;
    }
    setTasks((current) => current.filter((task) => task.status !== "completed"));
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
        body: JSON.stringify({ taskId: task.id, title: task.title }),
      });

      if (!response.ok) throw new Error("Breakdown failed");
      const subtasks = await response.json();

      if (Array.isArray(subtasks)) {
        setTasks(prev => [...subtasks, ...prev]);
      }
    } catch (err) {
      console.error(err);
      setCustomAlert("Yapay zeka alt görev planlaması başarısız oldu. Lütfen tekrar deneyin.");
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
  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortTasks = (items: any[]) => [...items].sort((a, b) => {
    const dueA = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const dueB = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    if (dueA !== dueB) return dueA - dueB;
    return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
  });
  const mainTodoTasks = sortTasks(mainTasks.filter(t => t.status !== "completed"));
  const completedTasks = sortTasks(mainTasks.filter(t => t.status === "completed"));

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
              <label htmlFor="course" className="block text-xs font-bold text-gray-500 uppercase">{t.tasks.relatedCourse}</label>
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
                  <option value="high">{lang === "zh" ? "高 🔴" : lang === "es" ? "Alta 🔴" : "High 🔴"}</option>
                  <option value="medium">{lang === "zh" ? "中 🟡" : lang === "es" ? "Media 🟡" : "Medium 🟡"}</option>
                  <option value="low">{lang === "zh" ? "低 🟢" : lang === "es" ? "Baja 🟢" : "Low 🟢"}</option>
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
          
          {/* Active Tasks list */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-surface-dark">{t.tasks.tasksTodo} ({mainTodoTasks.length})</h2>
            
            <div className="space-y-4">
              {mainTodoTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{t.tasks.allCompleted}</p>
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
                                  <Calendar size={12} /> {lang === "zh" ? "截止日期: " : lang === "es" ? "Vence: " : "Due: "} 
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                              <span className="flex items-center gap-1"><Clock size={12} /> {task.estimated_minutes}{t.common.minutes}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${task.priority === "high" ? "bg-red-50 text-red-500 border border-red-100" : task.priority === "medium" ? "bg-orange-50 text-orange-500 border border-orange-100" : "bg-gray-100 text-gray-500"}`}>
                            {task.priority}
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
                  {lang === "tr" ? "Tamamlananları temizle" : lang === "zh" ? "清除已完成" : lang === "es" ? "Limpiar completadas" : "Clear completed"}
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
                          {lang === "zh" ? "完成于: " : lang === "es" ? "Completado: " : "Finished: "} 
                          {new Date(task.completed_at || "").toLocaleDateString()}
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

      {/* Premium Upgrade Modal Popup */}
      {premiumModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <Lock size={22} />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-surface-dark">
                {lang === "zh" ? "解锁高级学习工具" : lang === "es" ? "Desbloquear Plan Premium" : "Unlock Premium Features"}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {lang === "zh" ? "免费版最多支持安排 6 个任务及常规进度跟进。升级至 Pro 即可解锁 AI 智能任务拆分及无限 AI 辅导。" : lang === "es" ? "El plan gratuito admite hasta 6 tareas activas. Actualiza a Pro para habilitar la subdivisión inteligente de tareas por IA y herramientas ilimitadas." : "Free tier accounts support up to 6 active tasks. Upgrade to Pro to enable automated AI task breakdown checklists and unlimited personalized study resources."}
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
                🚀 {lang === "zh" ? "升级至 Pro" : lang === "es" ? "Obtener Pro" : "Upgrade to Pro"}
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

    </main>
  );
}
