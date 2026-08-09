"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Award, CheckCircle2, Clock3, Flame, Loader2, Lock, Medal, Sparkles, Target, Trophy, Users, Zap } from "lucide-react";

type Profile = {
  id: string;
  full_name?: string | null;
  language?: string | null;
  plan?: string | null;
  trial_ends_at?: string | null;
  pro_expires_at?: string | null;
  subscription_status?: string | null;
  streak_count?: number | null;
  leaderboard_opt_in?: boolean | null;
  leaderboard_display_name?: string | null;
};
type Task = { id: string; status?: string | null; priority?: string | null; created_at?: string | null; updated_at?: string | null };
type FocusSession = { id: string; duration_seconds?: number | null; mode?: string | null; completed?: boolean | null; created_at?: string | null };
type LeaderboardRow = { user_id: string; display_name: string; focus_minutes: number; completed_tasks: number; streak_days: number; score: number };
type Metric = "score" | "focus" | "tasks";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "OP";
}

function weekStart() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date;
}

export default function AchievementsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCommunity, setSavingCommunity] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [optedIn, setOptedIn] = useState(false);
  const [metric, setMetric] = useState<Metric>("score");

  const lang = profile?.language || "en";
  const copy = ({
    en: { title: "Achievements & momentum", subtitle: "Build your own rhythm, then join a friendly weekly challenge with real OnPace students.", thisWeek: "This week", focus: "Focus minutes", tasks: "Completed tasks", streak: "Current streak", leaderboard: "Weekly community challenge", leaderboardText: "Only students who choose to participate appear here. Scores reset every Monday.", score: "Momentum score", join: "Join the community challenge", joinText: "Pick a public display name. Your courses, grades, notes and detailed history always remain private.", publicName: "Public display name", visible: "Show my weekly progress to other participants", save: "Save community settings", saving: "Saving…", empty: "No real participants have logged progress this week yet.", emptyText: "Be the first to join the friendly challenge — no demo profiles are shown.", you: "You", rank: "Your rank", unlocked: "unlocked", goal: "Weekly goal", minutesToGoal: "minutes to your 300-minute focus goal", tasksToGoal: "tasks to your 8-task goal", badges: "Your achievement path", completed: "completed", sessions: "focus blocks", error: "Community settings could not be saved. Please try again.", privacy: "Participation is optional and can be turned off anytime.", all: "Overall", focusOnly: "Focus", tasksOnly: "Tasks" },
    tr: { title: "Başarılar ve ivme", subtitle: "Önce kendi ritmini kur, sonra gerçek OnPace öğrencileriyle tatlı bir haftalık mücadeleye katıl.", thisWeek: "Bu hafta", focus: "Odak dakikası", tasks: "Tamamlanan görev", streak: "Mevcut seri", leaderboard: "Haftalık topluluk mücadelesi", leaderboardText: "Burada yalnızca katılmayı seçen öğrenciler görünür. Puanlar her pazartesi yenilenir.", score: "İvme puanı", join: "Topluluk mücadelesine katıl", joinText: "Herkese açık görünen adını seç. Derslerin, notların, sınıfın ve ayrıntılı geçmişin her zaman gizli kalır.", publicName: "Herkese açık ad", visible: "Haftalık ilerlememi diğer katılımcılara göster", save: "Topluluk ayarlarını kaydet", saving: "Kaydediliyor…", empty: "Bu hafta henüz ilerleme kaydetmiş gerçek bir katılımcı yok.", emptyText: "Tatlı mücadeleye ilk katılan sen ol — demo profil gösterilmez.", you: "Sen", rank: "Sıralaman", unlocked: "açıldı", goal: "Haftalık hedef", minutesToGoal: "dakika sonra 300 dakikalık odak hedefine ulaşacaksın", tasksToGoal: "görev sonra 8 görevlik hedefine ulaşacaksın", badges: "Başarı yolun", completed: "tamamlandı", sessions: "odak bloğu", error: "Topluluk ayarları kaydedilemedi. Lütfen yeniden dene.", privacy: "Katılım isteğe bağlıdır; istediğin zaman kapatabilirsin.", all: "Genel", focusOnly: "Odak", tasksOnly: "Görevler" },
    es: { title: "Logros y ritmo", subtitle: "Construye tu propio ritmo y luego únete a un reto semanal amistoso con estudiantes reales de OnPace.", thisWeek: "Esta semana", focus: "Minutos de enfoque", tasks: "Tareas completadas", streak: "Racha actual", leaderboard: "Reto semanal de la comunidad", leaderboardText: "Solo aparecen estudiantes que deciden participar. Las puntuaciones se reinician cada lunes.", score: "Puntuación de ritmo", join: "Únete al reto comunitario", joinText: "Elige un nombre público. Tus cursos, notas, calificaciones e historial detallado siempre permanecen privados.", publicName: "Nombre público", visible: "Mostrar mi progreso semanal a otros participantes", save: "Guardar ajustes de comunidad", saving: "Guardando…", empty: "Ningún participante real ha registrado progreso esta semana todavía.", emptyText: "Sé la primera persona en unirte al reto amistoso: no se muestran perfiles de demostración.", you: "Tú", rank: "Tu posición", unlocked: "desbloqueado", goal: "Meta semanal", minutesToGoal: "minutos para tu meta de 300 minutos de enfoque", tasksToGoal: "tareas para tu meta de 8 tareas", badges: "Tu ruta de logros", completed: "completado", sessions: "bloques de enfoque", error: "No se pudieron guardar los ajustes comunitarios. Inténtalo otra vez.", privacy: "La participación es opcional y puedes desactivarla cuando quieras.", all: "General", focusOnly: "Enfoque", tasksOnly: "Tareas" },
    zh: { title: "成就与动力", subtitle: "先建立自己的学习节奏，再与真实 OnPace 学生一起参加友好的每周挑战。", thisWeek: "本周", focus: "专注分钟", tasks: "已完成任务", streak: "当前连胜", leaderboard: "每周社区挑战", leaderboardText: "只有选择参与的学生会出现在这里。分数将在每周一重置。", score: "动力分数", join: "加入社区挑战", joinText: "选择一个公开显示的名称。您的课程、成绩、笔记和详细历史始终保持私密。", publicName: "公开显示名称", visible: "向其他参与者展示我的每周进度", save: "保存社区设置", saving: "正在保存…", empty: "本周还没有真实参与者记录学习进度。", emptyText: "成为第一个加入友好挑战的人——这里不显示演示账户。", you: "你", rank: "你的排名", unlocked: "已解锁", goal: "每周目标", minutesToGoal: "分钟后即可完成 300 分钟专注目标", tasksToGoal: "个任务后即可完成 8 个任务目标", badges: "你的成就路径", completed: "已完成", sessions: "专注区块", error: "无法保存社区设置，请重试。", privacy: "参与完全自愿，您可以随时关闭。", all: "综合", focusOnly: "专注", tasksOnly: "任务" },
  } as const)[lang as "en" | "tr" | "es" | "zh"] || ({} as never);

  const refreshLeaderboard = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_weekly_study_leaderboard");
    if (error) {
      setLeaderboard([]);
      return;
    }
    setLeaderboard((data || []) as LeaderboardRow[]);
  }, [supabase]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const start = weekStart().toISOString();
      const [profileResult, taskResult, focusResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("tasks").select("id,status,priority,created_at,updated_at").eq("user_id", user.id),
        supabase.from("focus_sessions").select("id,duration_seconds,mode,completed,created_at").eq("user_id", user.id).eq("mode", "study").eq("completed", true).gte("created_at", start),
      ]);
      const currentProfile = profileResult.data as Profile | null;
      const trialActive = currentProfile?.trial_ends_at && new Date(currentProfile.trial_ends_at) > new Date();
      const paidActive = currentProfile?.plan === "founding" || (currentProfile?.plan === "pro" && currentProfile.subscription_status !== "expired" && (!currentProfile.pro_expires_at || new Date(currentProfile.pro_expires_at) > new Date()));
      if (!trialActive && !paidActive) { router.push("/billing"); return; }
      setProfile(currentProfile);
      setDisplayName(currentProfile?.leaderboard_display_name || currentProfile?.full_name || "");
      setOptedIn(Boolean(currentProfile?.leaderboard_opt_in));
      setTasks((taskResult.data || []) as Task[]);
      setFocusSessions((focusResult.data || []) as FocusSession[]);
      await refreshLeaderboard();
      setLoading(false);
    }
    void load();
  }, [refreshLeaderboard, router, supabase]);

  const weeklyFocusMinutes = useMemo(() => Math.floor(focusSessions.reduce((sum, session) => sum + Number(session.duration_seconds || 0), 0) / 60), [focusSessions]);
  const weeklyTasks = useMemo(() => {
    const start = weekStart().getTime();
    return tasks.filter((task) => task.status === "completed" && new Date(task.updated_at || task.created_at || 0).getTime() >= start).length;
  }, [tasks]);
  const allCompletedTasks = tasks.filter((task) => task.status === "completed").length;
  const highPriorityCompleted = tasks.filter((task) => task.status === "completed" && task.priority === "high").length;
  const streak = Number(profile?.streak_count || 0);
  const score = weeklyFocusMinutes + weeklyTasks * 25 + streak * 10;
  const sortedLeaderboard = useMemo(() => [...leaderboard].sort((a, b) => metric === "focus" ? b.focus_minutes - a.focus_minutes || b.score - a.score : metric === "tasks" ? b.completed_tasks - a.completed_tasks || b.score - a.score : b.score - a.score || b.focus_minutes - a.focus_minutes), [leaderboard, metric]);
  const rank = profile?.id ? sortedLeaderboard.findIndex((row) => row.user_id === profile.id) + 1 : 0;

  const badges = [
    { id: "first", name: lang === "tr" ? "İlk Adım" : lang === "es" ? "Primer paso" : lang === "zh" ? "第一步" : "First step", description: lang === "tr" ? "İlk çalışma görevini tamamla." : "Complete your first study task.", target: 1, value: allCompletedTasks, icon: CheckCircle2 },
    { id: "streak", name: lang === "tr" ? "Kararlı Öğrenci" : lang === "es" ? "Estudiante constante" : lang === "zh" ? "坚持学习" : "Consistent student", description: lang === "tr" ? "5 günlük seri oluştur." : "Build a 5-day study streak.", target: 5, value: streak, icon: Flame },
    { id: "focus", name: lang === "tr" ? "Odak Şampiyonu" : lang === "es" ? "Campeón de enfoque" : lang === "zh" ? "专注冠军" : "Focus champion", description: lang === "tr" ? "3 odak bloğunu tamamla." : "Complete 3 focus blocks.", target: 3, value: focusSessions.length, icon: Clock3 },
    { id: "priority", name: lang === "tr" ? "Öncelik Ustası" : lang === "es" ? "Maestro de prioridades" : lang === "zh" ? "优先级大师" : "Priority master", description: lang === "tr" ? "5 yüksek öncelikli görevi bitir." : "Complete 5 high-priority tasks.", target: 5, value: highPriorityCompleted, icon: Target },
    { id: "momentum", name: lang === "tr" ? "İvme Yakala" : lang === "es" ? "En movimiento" : lang === "zh" ? "动力满满" : "Build momentum", description: lang === "tr" ? "Bu hafta 300 dakika odaklan." : "Reach 300 focus minutes this week.", target: 300, value: weeklyFocusMinutes, icon: Zap },
    { id: "community", name: lang === "tr" ? "Topluluk Ritmi" : lang === "es" ? "Ritmo comunitario" : lang === "zh" ? "社区节奏" : "Community rhythm", description: lang === "tr" ? "Topluluk mücadelesine katıl." : "Join the community challenge.", target: 1, value: optedIn ? 1 : 0, icon: Users },
  ];
  const unlocked = badges.filter((badge) => badge.value >= badge.target).length;

  const saveCommunitySettings = async () => {
    setSavingCommunity(true); setCommunityError(null);
    const { data, error } = await supabase.rpc("set_my_leaderboard_profile", { p_opt_in: optedIn, p_display_name: displayName });
    if (error) setCommunityError(error.message || copy.error);
    else {
      const settings = Array.isArray(data) ? data[0] : data;
      setProfile((current) => current ? { ...current, leaderboard_opt_in: settings?.leaderboard_opt_in ?? optedIn, leaderboard_display_name: settings?.leaderboard_display_name ?? displayName } : current);
      await refreshLeaderboard();
    }
    setSavingCommunity(false);
  };

  if (loading) return <div className="flex h-full min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-brand" size={30} /></div>;

  return <main className="mx-auto flex w-full max-w-[1450px] flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 lg:p-9">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand">{copy.thisWeek}</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-black tracking-tight text-surface-dark sm:text-4xl"><span className="rounded-2xl bg-brand/10 p-2.5 text-brand"><Trophy size={28} /></span>{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{copy.subtitle}</p></div><div className="rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 text-right"><p className="text-[10px] font-black uppercase tracking-wider text-brand">{copy.score}</p><p className="mt-1 text-2xl font-black text-surface-dark">{score}</p></div></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: copy.focus, value: weeklyFocusMinutes, suffix: "min", icon: Clock3, tone: "text-brand bg-brand/10" }, { label: copy.tasks, value: weeklyTasks, suffix: "", icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50" }, { label: copy.streak, value: streak, suffix: lang === "tr" ? " gün" : "d", icon: Flame, tone: "text-orange-700 bg-orange-50" }, { label: copy.rank, value: rank || "—", suffix: rank ? ` / ${sortedLeaderboard.length}` : "", icon: Medal, tone: "text-amber-700 bg-amber-50" }].map(({ label, value, suffix, icon: Icon, tone }) => <article key={label} className="rounded-3xl border border-gray-150 bg-white p-4 shadow-sm"><div className={`inline-flex rounded-2xl p-2.5 ${tone}`}><Icon size={19} /></div><p className="mt-4 text-xs font-bold text-gray-500">{label}</p><p className="mt-1 text-2xl font-black text-surface-dark">{value}<span className="ml-1 text-sm font-bold text-gray-400">{suffix}</span></p></article>)}
    </section>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
      <article className="rounded-[2rem] border border-gray-150 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="flex items-center gap-2 text-xl font-black text-surface-dark"><Users className="text-brand" size={21} />{copy.leaderboard}</h2><p className="mt-1 max-w-xl text-xs leading-5 text-gray-500">{copy.leaderboardText}</p></div><div className="flex rounded-xl bg-gray-100 p-1 text-[11px] font-bold">{([{ key: "score", label: copy.all }, { key: "focus", label: copy.focusOnly }, { key: "tasks", label: copy.tasksOnly }] as const).map((item) => <button type="button" key={item.key} onClick={() => setMetric(item.key)} className={`rounded-lg px-3 py-2 transition ${metric === item.key ? "bg-white text-brand shadow-sm" : "text-gray-500"}`}>{item.label}</button>)}</div></div>
        {sortedLeaderboard.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-brand/25 bg-brand/[0.03] p-7 text-center"><Users className="mx-auto text-brand" size={26} /><p className="mt-3 text-sm font-extrabold text-surface-dark">{copy.empty}</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">{copy.emptyText}</p></div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[610px] text-left text-xs"><thead><tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400"><th className="px-2 py-3">#</th><th className="px-2 py-3">{lang === "tr" ? "Öğrenci" : "Student"}</th><th className="px-2 py-3 text-center">{copy.focus}</th><th className="px-2 py-3 text-center">{copy.tasks}</th><th className="px-2 py-3 text-center">{copy.streak}</th><th className="px-2 py-3 text-right">{copy.score}</th></tr></thead><tbody>{sortedLeaderboard.map((row, index) => { const mine = row.user_id === profile?.id; return <tr key={row.user_id} className={`border-b border-gray-50 last:border-0 ${mine ? "bg-brand/[0.04]" : "hover:bg-gray-50"}`}><td className="px-2 py-3.5"><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-black ${index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-200 text-slate-700" : index === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>{index + 1}</span></td><td className="px-2 py-3.5"><div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-black ${mine ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}>{initials(row.display_name)}</span><span className={`font-extrabold ${mine ? "text-brand" : "text-surface-dark"}`}>{mine ? `${row.display_name} (${copy.you})` : row.display_name}</span></div></td><td className="px-2 py-3.5 text-center font-semibold text-gray-600">{row.focus_minutes}m</td><td className="px-2 py-3.5 text-center font-semibold text-gray-600">{row.completed_tasks}</td><td className="px-2 py-3.5 text-center font-semibold text-gray-600">🔥 {row.streak_days}</td><td className="px-2 py-3.5 text-right font-black text-surface-dark">{row.score}</td></tr>; })}</tbody></table></div>}
      </article>

      <aside className="rounded-[2rem] border border-brand/15 bg-gradient-to-br from-brand/[0.08] via-white to-accent/10 p-5 shadow-sm sm:p-7"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white"><Sparkles size={20} /></div><h2 className="mt-4 text-xl font-black text-surface-dark">{copy.join}</h2><p className="mt-2 text-xs leading-5 text-gray-600">{copy.joinText}</p><label className="mt-5 block text-xs font-extrabold text-surface-dark">{copy.publicName}<input value={displayName} onChange={(event) => setDisplayName(event.target.value.slice(0, 40))} maxLength={40} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" /></label><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white/80 p-3 text-xs font-semibold text-gray-700"><input type="checkbox" checked={optedIn} onChange={(event) => setOptedIn(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand" />{copy.visible}</label>{communityError && <p className="mt-3 text-xs font-semibold text-red-600">{communityError}</p>}<button type="button" onClick={() => void saveCommunitySettings()} disabled={savingCommunity || (optedIn && displayName.trim().length < 2)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-black text-white transition hover:bg-brand-hover disabled:opacity-50">{savingCommunity && <Loader2 size={15} className="animate-spin" />}{savingCommunity ? copy.saving : copy.save}</button><p className="mt-3 text-center text-[11px] leading-4 text-gray-500">{copy.privacy}</p></aside>
    </section>

    <section className="rounded-[2rem] border border-gray-150 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 text-xl font-black text-surface-dark"><Award className="text-brand" size={21} />{copy.badges}</h2><p className="mt-1 text-xs text-gray-500">{unlocked} / {badges.length} {copy.unlocked}</p></div><div className="w-full overflow-hidden rounded-full bg-gray-100 sm:w-52"><div className="h-2.5 rounded-full bg-brand transition-all" style={{ width: `${Math.round(unlocked / badges.length * 100)}%` }} /></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{badges.map((badge) => { const Icon = badge.icon; const done = badge.value >= badge.target; const progress = Math.min(100, Math.round(badge.value / badge.target * 100)); return <article key={badge.id} className={`rounded-2xl border p-4 ${done ? "border-brand/20 bg-brand/[0.03]" : "border-gray-150 bg-gray-50/60"}`}><div className="flex items-start justify-between"><span className={`rounded-xl p-2.5 ${done ? "bg-brand/10 text-brand" : "bg-gray-200 text-gray-400"}`}><Icon size={18} /></span>{done ? <CheckCircle2 className="text-emerald-600" size={18} /> : <Lock className="text-gray-300" size={16} />}</div><h3 className="mt-4 text-sm font-extrabold text-surface-dark">{badge.name}</h3><p className="mt-1 min-h-9 text-xs leading-5 text-gray-500">{badge.description}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className={`h-full rounded-full ${done ? "bg-brand" : "bg-gray-400"}`} style={{ width: `${progress}%` }} /></div><p className="mt-2 text-right text-[10px] font-black text-gray-500">{badge.value}/{badge.target} {badge.id === "focus" ? copy.sessions : copy.completed}</p></article>; })}</div></section>
  </main>;
}
