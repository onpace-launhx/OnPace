"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Trophy,
  Award,
  Lock,
  Loader2,
  Sparkles,
  Flame,
  CheckCircle,
  Clock,
  TrendingUp,
  HelpCircle
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

export default function AchievementsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [studySessions, setStudySessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      const now = new Date();
      const trialEnds = profileData?.trial_ends_at ? new Date(profileData.trial_ends_at) : null;
      const isTrialActive = trialEnds && trialEnds > now;
      const isPro = profileData?.plan === "pro" || profileData?.plan === "founding" || isTrialActive;

      if (!isPro) {
        router.push("/billing");
        return;
      }
      
      setProfile(profileData);

      // Load tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id);
      if (tasksData) setTasks(tasksData);

      // Load sessions
      const { data: sessionsData } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id);
      if (sessionsData) setStudySessions(sessionsData);

      setLoading(false);
    }
    loadData();
  }, [router, supabase]);

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

  // Dynamic achievement calculations
  const totalCompletedTasks = tasks.filter(t => t.status === "completed").length;
  const currentStreak = profile?.streak_count || 0;
  const totalStudySessions = studySessions.length;

  const achievementsList = [
    {
      id: "first_step",
      name: lang === "zh" ? "万事开头难" : lang === "es" ? "Primer Paso" : "First Step",
      description: lang === "zh" ? "在 OnPace 上完成你的第一个学习任务。" : lang === "es" ? "Completa tu primera tarea de estudio en OnPace." : "Complete your first study task on OnPace.",
      icon: CheckCircle,
      unlocked: totalCompletedTasks >= 1,
      metric: lang === "zh" ? `${totalCompletedTasks}/1 任务` : lang === "es" ? `${totalCompletedTasks}/1 Tarea` : `${totalCompletedTasks}/1 Tasks`
    },
    {
      id: "streak_5",
      name: lang === "zh" ? "持之以恒" : lang === "es" ? "Estudiante Constante" : "Consistent Student",
      description: lang === "zh" ? "达到 5 天的连续学习打卡纪录。" : lang === "es" ? "Consigue una racha de estudio de 5 días." : "Reach a 5-day active study streak.",
      icon: Flame,
      unlocked: currentStreak >= 5,
      metric: lang === "zh" ? `${currentStreak}/5 天` : lang === "es" ? `${currentStreak}/5 Días` : `${currentStreak}/5 Days`
    },
    {
      id: "sessions_3",
      name: lang === "zh" ? "专注大师" : lang === "es" ? "Campeón de Enfoque" : "Focus Champion",
      description: lang === "zh" ? "规划并完成 3 次自主专注学习块。" : lang === "es" ? "Programa y completa 3 bloques de estudio." : "Schedule and complete 3 study blocks.",
      icon: Clock,
      unlocked: totalStudySessions >= 3,
      metric: lang === "zh" ? `${totalStudySessions}/3 次` : lang === "es" ? `${totalStudySessions}/3 Bloques` : `${totalStudySessions}/3 Blocks`
    },
    {
      id: "ap_finisher",
      name: lang === "zh" ? "学霸攻坚" : lang === "es" ? "Triturador AP" : "AP Crusher",
      description: lang === "zh" ? "完成 5 个高优级别的作业任务。" : lang === "es" ? "Completa 5 tareas de estudio de alta prioridad." : "Complete 5 high-priority study tasks.",
      icon: TrendingUp,
      unlocked: tasks.filter(t => t.status === "completed" && t.priority === "high").length >= 5,
      metric: lang === "zh" ? `${tasks.filter(t => t.status === "completed" && t.priority === "high").length}/5 高优` : lang === "es" ? `${tasks.filter(t => t.status === "completed" && t.priority === "high").length}/5 Altas` : `${tasks.filter(t => t.status === "completed" && t.priority === "high").length}/5 High Tasks`
    },
    {
      id: "perfectionist",
      name: lang === "zh" ? "功德圆满" : lang === "es" ? "Ritmo Perfecto" : "Pacing Perfect",
      description: lang === "zh" ? "累计完成 10 个课程作业分配。" : lang === "es" ? "Completa 10 tareas escolares en total." : "Complete 10 total assignments.",
      icon: Trophy,
      unlocked: totalCompletedTasks >= 10,
      metric: lang === "zh" ? `${totalCompletedTasks}/10 任务` : lang === "es" ? `${totalCompletedTasks}/10 Tareas` : `${totalCompletedTasks}/10 Tasks`
    },
    {
      id: "early_adopter",
      name: lang === "zh" ? "至尊计划" : lang === "es" ? "Ritmo Premium" : "Premium Pace",
      description: lang === "zh" ? "致力于 Pro 级别的个性化学术规划。" : lang === "es" ? "Comprométete con la planificación Pro." : "Commit to Pro tier academic planning.",
      icon: Sparkles,
      unlocked: profile?.plan === "pro" || profile?.plan === "founding",
      metric: lang === "zh" ? "高级通道激活" : lang === "es" ? "Pro Activo" : "Pro Active"
    }
  ];

  const unlockedCount = achievementsList.filter(a => a.unlocked).length;
  const progressPercent = Math.round((unlockedCount / achievementsList.length) * 100);

  return (
    <main className="flex-1 p-6 lg:p-10 overflow-y-auto space-y-8 max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
            <Trophy className="text-brand" /> {lang === "zh" ? "荣誉勋章馆" : lang === "es" ? "Logros de Honor" : "Honor Achievements"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.achievements.subtitle}</p>
        </div>
        
        <div className="bg-brand/10 text-brand px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border border-brand/10">
          🔥 {currentStreak} {t.common.streak}
        </div>
      </div>

      {/* Progress card */}
      <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex justify-between items-center text-sm font-semibold">
          <span className="text-gray-500">{lang === "zh" ? "勋章解锁进度" : lang === "es" ? "Progreso de Trofeos" : "Trophy Case Progress"}</span>
          <span className="text-brand">
            {lang === "zh" ? `已解锁 ${unlockedCount} / ${achievementsList.length} (${progressPercent}%)` : lang === "es" ? `${unlockedCount} / ${achievementsList.length} Desbloqueados (${progressPercent}%)` : `${unlockedCount} / ${achievementsList.length} Unlocked (${progressPercent}%)`}
          </span>
        </div>
        <div className="bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-brand h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievementsList.map((badge) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.id}
              className={`border p-6 rounded-3xl transition-all relative overflow-hidden flex flex-col justify-between h-48 ${
                badge.unlocked
                  ? "bg-white border-brand/20 shadow-sm"
                  : "bg-gray-50/50 border-gray-150 text-gray-400"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl ${badge.unlocked ? "bg-brand/10 text-brand" : "bg-gray-200 text-gray-400"}`}>
                  <Icon size={20} />
                </div>
                {!badge.unlocked && <Lock size={14} className="text-gray-300" />}
              </div>

              <div className="space-y-1 mt-4">
                <h3 className={`font-bold text-sm ${badge.unlocked ? "text-surface-dark" : "text-gray-400"}`}>
                  {badge.name}
                </h3>
                <p className="text-xs text-gray-500 leading-normal">{badge.description}</p>
              </div>

              <div className="flex justify-between items-center border-t border-gray-50 pt-3 mt-3 text-[10px] font-bold uppercase tracking-wider">
                <span className={badge.unlocked ? "text-brand" : "text-gray-400"}>{t.achievements.progress}</span>
                <span className={badge.unlocked ? "text-surface-dark" : "text-gray-400"}>{badge.metric}</span>
              </div>
            </div>
          );
        })}
      </div>

    </main>
  );
}
