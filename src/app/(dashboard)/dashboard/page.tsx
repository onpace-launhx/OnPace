"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut,
  LayoutDashboard,
  Calendar,
  CheckSquare,
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
  AlertCircle
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  const [courses, setCourses] = useState<any[]>([]);

  // Focus Timer States
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerType, setTimerType] = useState<"work" | "short" | "long">("work");
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(20); // starts at 20 mins for display

  // Mock Tasks State (highly interactive)
  const [tasks, setTasks] = useState([
    { id: 1, text: "Finish AP History chapter 4 summary", done: false, priority: "high" },
    { id: 2, text: "Solve 10 quadratic equation practice items", done: true, priority: "medium" },
    { id: 3, text: "Organize Chemistry notes on atomic models", done: false, priority: "low" }
  ]);
  const [newTaskText, setNewTaskText] = useState("");

  const [showTrialEndedModal, setShowTrialEndedModal] = useState(false);

  // Course Management States
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    // Limit check for Free plan: max 2 courses
    if (!isPro && courses.length >= 2) {
      alert("Free Plan is limited to 2 courses. Upgrade to Pro for unlimited course workspaces!");
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
          name: newCourseName.trim(),
          color: randomColor
        }
      ])
      .select("*")
      .single();

    if (!error && data) {
      setCourses([...courses, data]);
      setNewCourseName("");
    }
    setAddingCourse(false);
  };

  const handleDeleteCourse = async (courseId: string) => {
    setCourses(courses.filter(c => c.id !== courseId));
    await supabase.from("courses").delete().eq("id", courseId);
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
      
      if (coursesData) {
        setCourses(coursesData);
      }
      setLoading(false);
    }
    getUserData();
  }, [router, supabase]);

  // Pomodoro Countdown Logic
  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        if (timerSeconds === 0) {
          if (timerMinutes === 0) {
            // Timer complete
            setTimerActive(false);
            if (timerType === "work") {
              setTotalStudyMinutes(prev => prev + 25);
            }
            alert(`Timer complete! Enjoy your break.`);
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
  }, [timerActive, timerMinutes, timerSeconds, timerType]);

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

  // Task Actions
  const handleToggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([
      ...tasks,
      { id: Date.now(), text: newTaskText.trim(), done: false, priority: "medium" }
    ]);
    setNewTaskText("");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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

  const dateLocale = lang === "zh" ? "zh-CN" : lang === "es" ? "es-ES" : "en-US";
  const formattedDate = new Date().toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric' });

  const progressPercent = Math.min(Math.round((totalStudyMinutes / dailyGoal) * 100), 100);

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
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white border border-gray-200 text-surface-dark px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                🔥 {profile?.streak_count || 0} {t.common.streak}
              </span>
              <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${isPro ? "bg-brand/10 text-brand" : "bg-gray-100 text-gray-500"}`}>
                {isPro ? (profile?.plan === "founding" ? t.common.foundingBadge : t.common.proBadge) : t.common.freeBadge}
              </span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* SVG Progress Ring Card */}
            <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex items-center gap-6 md:col-span-2">
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
                  <p className="text-[10px] text-gray-400 font-medium">{t.dashboard.goalMinutes.split(" ")[0]}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-surface-dark">{t.dashboard.goalProgress}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t.dashboard.loggedMins} <strong className="text-brand font-semibold">{totalStudyMinutes} {t.common.minutes}</strong> {t.dashboard.outOfTarget} {dailyGoal} {t.dashboard.minuteTarget}
                </p>
                <Link href="/billing" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline mt-3">
                  {t.common.adjustGoal} <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {/* Micro Goals Streak Card */}
            <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.dashboard.activeTargets}</h4>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{t.dashboard.tasksFinished}</span>
                    <span className="font-semibold text-surface-dark">{tasks.filter(t => t.done).length} / {tasks.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{t.dashboard.goalMinutes}</span>
                    <span className="font-semibold text-surface-dark">{dailyGoal} {t.common.minutes}</span>
                  </div>
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
                      <form onSubmit={handleAddCourse} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newCourseName}
                          onChange={(e) => setNewCourseName(e.target.value)}
                          placeholder="e.g. AP Chemistry"
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
                                {course.name}
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

          {/* Interactive Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Widget: Interactive Tasks */}
            <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-extrabold text-surface-dark">{t.dashboard.activeStudyList}</h2>
                <span className="text-xs text-gray-500 font-medium">{t.dashboard.clickToComplete}</span>
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
                {tasks.map((task) => (
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
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${task.priority === "high" ? "bg-red-50 text-red-500 border border-red-100" : task.priority === "medium" ? "bg-orange-50 text-orange-500 border border-orange-100" : "bg-gray-100 text-gray-500"}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget: Live Pomodoro Focus Timer */}
            <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
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

          </div>

          {/* AI Recommendation Panel (Strictly visually identified) */}
          <div className="relative overflow-hidden bg-gradient-to-tr from-brand/5 to-brand-light/20 border border-brand/10 p-6 sm:p-8 rounded-3xl">
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
                  {t.dashboard.aiSubtitle}
                </h3>
                <p className="text-sm text-gray-600 max-w-2xl">
                  {t.dashboard.aiRecommendation}
                </p>
              </div>
              <button className="px-5 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover shadow-sm active:scale-95 transition-all cursor-pointer shrink-0">
                {t.dashboard.generateSchedule}
              </button>
            </div>
          </div>

        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-6 flex justify-around items-center z-40">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-brand">
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">{lang === "zh" ? "主页" : lang === "es" ? "Inicio" : "Home"}</span>
          </Link>
          <Link href="/tasks" className="flex flex-col items-center gap-1 text-gray-400">
            <CheckSquare size={20} />
            <span className="text-[10px] font-medium">{lang === "zh" ? "学习任务" : lang === "es" ? "Tareas" : "Tasks"}</span>
          </Link>
          <Link href="/calendar" className="flex flex-col items-center gap-1 text-gray-400">
            <Calendar size={20} />
            <span className="text-[10px] font-medium">{lang === "zh" ? "日历日程" : lang === "es" ? "Calendario" : "Calendar"}</span>
          </Link>
          <Link href="/billing" className="flex flex-col items-center gap-1 text-gray-400">
            <Sparkles size={20} />
            <span className="text-[10px] font-medium">{lang === "zh" ? "订阅账单" : lang === "es" ? "Suscripción" : "Billing"}</span>
          </Link>
        </nav>
      </main>
  );
}
