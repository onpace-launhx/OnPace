"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut,
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Timer,
  Sparkles,
  Trophy,
  Lock,
  ShieldCheck,
  BookOpen,
  Menu,
  Settings,
  Globe,
  Loader2,
  CheckCircle2,
  User,
  Users
} from "lucide-react";

// Sidebar multi-language translations dictionary
const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    tasks: "Tasks",
    calendar: "Calendar",
    notes: "Study Notes",
    focus: "Focus Mode",
    ai: "AI Assistant",
    achievements: "Achievements",
    admin: "Admin Panel",
    signout: "Sign out",
    profileSettings: "Profile Settings",
    fullName: "Full Name",
    gradeLevel: "Grade Level",
    studyGoal: "Daily Goal (mins)",
    language: "Language",
    save: "Save Changes",
    close: "Close",
    saving: "Saving...",
    saved: "Saved!",
    proBannerTitle: "Go Premium",
    proBannerDesc: "Unlock AI planner, quizzes & advanced metrics.",
    upgrade: "Upgrade to Pro",
    proBadge: "Pro Member",
    foundingBadge: "Founding Member",
    freeBadge: "Free Member",
    studyGroups: "Study Groups"
  },
  es: {
    dashboard: "Tablero",
    tasks: "Tareas",
    calendar: "Calendario",
    notes: "Notas de Estudio",
    focus: "Modo de Enfoque",
    ai: "Asistente de IA",
    achievements: "Logros",
    admin: "Panel de Admin",
    signout: "Cerrar sesión",
    profileSettings: "Configuración de Perfil",
    fullName: "Nombre Completo",
    gradeLevel: "Nivel de Grado",
    studyGoal: "Meta Diaria (mins)",
    language: "Idioma",
    save: "Guardar Cambios",
    close: "Cerrar",
    saving: "Guardando...",
    saved: "¡Guardado!",
    proBannerTitle: "Hacerse Premium",
    proBannerDesc: "Desbloquea planificador de IA, exámenes y métricas.",
    upgrade: "Actualizar a Pro",
    proBadge: "Miembro Pro",
    foundingBadge: "Miembro Fundador",
    freeBadge: "Miembro Gratis",
    studyGroups: "Grupos de Estudio"
  },
  zh: {
    dashboard: "学习大厅",
    tasks: "学习任务",
    calendar: "学习日历",
    notes: "学习笔记",
    focus: "专注模式",
    ai: "智能AI教练",
    achievements: "荣誉里程碑",
    admin: "管理员面板",
    signout: "退出登录",
    profileSettings: "个人资料设置",
    fullName: "完整姓名",
    gradeLevel: "年级/学习阶段",
    studyGoal: "每日目标 (分钟)",
    language: "界面语言",
    save: "保存更改",
    close: "关闭",
    saving: "保存中...",
    saved: "已保存!",
    proBannerTitle: "解锁高级版",
    proBannerDesc: "开启AI学习计划、智能测验与专属数据分析。",
    upgrade: "升级到Pro",
    proBadge: "Pro 专业版会员",
    foundingBadge: "创始会员",
    freeBadge: "免费版用户",
    studyGroups: "学习小组"
  },
  tr: {
    dashboard: "Çalışma Paneli",
    tasks: "Görevler",
    calendar: "Takvim",
    notes: "Çalışma Notları",
    focus: "Odaklanma Modu",
    ai: "Yapay Zeka Asistanı",
    achievements: "Başarılar",
    admin: "Yönetici Paneli",
    signout: "Çıkış Yap",
    profileSettings: "Profil Ayarları",
    fullName: "Ad Soyad",
    gradeLevel: "Sınıf / Hedef Seviyesi",
    studyGoal: "Günlük Hedef (dk)",
    language: "Dil",
    save: "Kaydet",
    close: "Kapat",
    saving: "Kaydediliyor...",
    saved: "Kaydedildi!",
    proBannerTitle: "Premium'a Geç",
    proBannerDesc: "Yapay zeka planlayıcı, quizler ve gelişmiş metrikleri aç.",
    upgrade: "Pro Plana Yükselt",
    proBadge: "Pro Üye",
    foundingBadge: "Kurucu Üye",
    freeBadge: "Ücretsiz Üye",
    studyGroups: "Çalışma Grupları"
  }
};

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Collapsible sidebar state (persisted locally)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Profile modal settings state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editGoal, setEditGoal] = useState("60");
  const [editLang, setEditLang] = useState("en");
  const [editEmailNotifications, setEditEmailNotifications] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Google Calendar Integration Settings inside Sidebar
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);

  useEffect(() => {
    // Load collapsed preference from local storage if exists
    const storedCollapse = localStorage.getItem("sidebar_collapsed");
    if (storedCollapse === "true") {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    // Detect setting parameter to auto-open Google Calendar profile settings modal
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("settings") === "google") {
        setShowProfileModal(true);
      }
    }
  }, [pathname]); // Run on route changes

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // Check if user has Google Calendar linked in user_google_tokens
      const { data: googleToken } = await supabase
        .from("user_google_tokens")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (googleToken) {
        setGoogleConnected(true);
        setGoogleEmail(user.email || "Google Connected");
      } else {
        setGoogleConnected(false);
        setGoogleEmail("");
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setEditName(data.full_name || "");
        setEditEmail(user.email || "");
        setEditGrade(data.grade_level || "");
        setEditGoal(String(data.daily_study_goal_minutes || 60));
        setEditLang(data.language || "en");
      }
      setLoading(false);
    }
    getProfile();
  }, [supabase, showProfileModal]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleToggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar_collapsed", String(nextState));
  };

  const handleOpenProfileModal = () => {
    if (!profile) return;
    setEditName(profile.full_name || "");
    setEditEmail(user?.email || "");
    setEditGrade(profile.grade_level || "");
    setEditGoal(String(profile.daily_study_goal_minutes || 60));
    setEditLang(profile.language || "en");
    setEditEmailNotifications(profile.email_notifications_enabled !== false);
    setSaveSuccess(false);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveSuccess(false);

    // If email has changed, call direct RPC to update auth.users
    if (editEmail.trim().toLowerCase() !== user.email?.toLowerCase()) {
      const { error: emailError } = await supabase.rpc("update_user_email_direct", {
        new_email: editEmail.trim().toLowerCase()
      });
      if (emailError) {
        alert("Failed to update email: " + emailError.message);
        setSavingProfile(false);
        return;
      }
    }

    let { error } = await supabase
      .from("profiles")
      .update({
        full_name: editName.trim(),
        grade_level: editGrade.trim(),
        daily_study_goal_minutes: parseInt(editGoal) || 60,
        language: editLang,
        email_notifications_enabled: editEmailNotifications
      })
      .eq("id", user.id);

    // Fallback if email_notifications_enabled column is not in DB schema yet
    if (error && (error.message?.includes("email_notifications_enabled") || error.code === "PGRST204")) {
      const fallback = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          grade_level: editGrade.trim(),
          daily_study_goal_minutes: parseInt(editGoal) || 60,
          language: editLang
        })
        .eq("id", user.id);
      error = fallback.error;
    }

    if (!error) {
      setSaveSuccess(true);
      setProfile({
        ...profile,
        full_name: editName.trim(),
        grade_level: editGrade.trim(),
        daily_study_goal_minutes: parseInt(editGoal) || 60,
        language: editLang,
        email_notifications_enabled: editEmailNotifications
      });
      setTimeout(() => {
        setSaveSuccess(false);
        setShowProfileModal(false);
        // Reload pages that translate dynamically
        window.location.reload();
      }, 1000);
    } else {
      alert("Failed to save profile settings: " + (error.message || "Unknown error"));
    }
    setSavingProfile(false);
  };

  const handleRealGoogleOAuth = () => {
    // Redirect to our custom Google OAuth route which requests calendar scope
    // Works for both email-signup users and Google-signup users
    window.location.href = "/api/google/oauth";
  };

  const handleDisconnectGoogle = async () => {
    setIsSyncingGoogle(true);
    setGoogleConnected(false);
    setGoogleEmail("");

    try {
      // 1. Remove google tokens from Supabase DB to un-link the calendar
      await supabase
        .from("user_google_tokens")
        .delete()
        .eq("user_id", user.id);

      // 2. Clear any study sessions pulled from Google calendar
      await supabase
        .from("study_sessions")
        .delete()
        .eq("user_id", user.id)
        .like("title", "📅 [Google]%");

      window.dispatchEvent(new Event("calendar-sync"));
    } catch (e) {
      console.error(e);
    }
    setIsSyncingGoogle(false);
  };


  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnds && trialEnds > now;
  const isPro = profile?.plan === "pro" || profile?.plan === "founding" || isTrialActive;
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  // Select active language translation pack (falls back to English)
  const lang = profile?.language || "en";
  const t = translations[lang] || translations.en;

  const navItems = [
    { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard, requiresPro: false },
    { href: "/tasks", label: t.tasks, icon: CheckSquare, requiresPro: false },
    { href: "/calendar", label: t.calendar, icon: Calendar, requiresPro: false },
    { href: "/notes", label: t.notes, icon: BookOpen, requiresPro: true },
    { href: "/focus", label: t.focus, icon: Timer, requiresPro: true },
    { href: "/ai-assistant", label: t.ai, icon: Sparkles, requiresPro: true },
    { href: "/study-groups", label: t.studyGroups, icon: Users, requiresPro: true },
    { href: "/profile", label: lang === "tr" ? "Profil & Sosyal" : "Profile & Social", icon: User, requiresPro: false },
    { href: "/achievements", label: t.achievements, icon: Trophy, requiresPro: true },
  ];

  if (loading) {
    return (
      <aside className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white p-6 justify-between shrink-0 h-screen sticky top-0">
        <div className="space-y-8 animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded-lg"></div>
          <div className="space-y-3 pt-6">
            <div className="h-10 bg-gray-150 rounded-xl"></div>
            <div className="h-10 bg-gray-150 rounded-xl"></div>
            <div className="h-10 bg-gray-150 rounded-xl"></div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside 
        className={`hidden lg:flex flex-col border-r border-gray-200 bg-white p-5 justify-between shrink-0 h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="space-y-6">
          {/* Header & Hamburger swapper */}
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="OnPace Logo" width={28} height={28} className="rounded-lg object-contain" />
                <span className="text-lg font-bold tracking-tight text-surface-dark">OnPace</span>
              </Link>
            )}
            {isCollapsed && (
              <Link href="/" className="flex h-7 w-7 items-center justify-center mx-auto">
                <Image src="/logo.png" alt="OnPace Logo" width={28} height={28} className="rounded-lg object-contain" />
              </Link>
            )}
            
            <button
              onClick={handleToggleCollapse}
              className={`p-1.5 rounded-lg text-gray-400 hover:text-surface-dark hover:bg-gray-100 transition-all cursor-pointer ${
                isCollapsed ? "mx-auto mt-2" : ""
              }`}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu size={18} />
            </button>
          </div>
          
          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const isLocked = item.requiresPro && !isPro;
              const href = isLocked ? "/billing" : item.href;

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? "text-brand bg-brand-light font-semibold"
                      : "text-gray-600 hover:text-brand hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={18} className="shrink-0" />
                    {!isCollapsed && item.label}
                  </span>
                  {isLocked && !isCollapsed && (
                    <Lock size={12} className="text-gray-400 group-hover:text-brand shrink-0" />
                  )}
                </Link>
              );
            })}

            {/* Admin panel link */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center justify-center gap-3 px-3 py-2.5 mt-4 text-sm font-bold rounded-xl transition-all ${
                  pathname === "/admin"
                    ? "text-white bg-red-600 hover:bg-red-700"
                    : "text-red-600 bg-red-50 hover:bg-red-100"
                }`}
                title={isCollapsed ? t.admin : undefined}
              >
                <ShieldCheck size={18} className="shrink-0" />
                {!isCollapsed && t.admin}
              </Link>
            )}
          </nav>
        </div>

        {/* Bottom Panel */}
        <div className="space-y-4">
          {/* Upgrade banner (Hidden when collapsed) */}
          {!isPro && !isCollapsed && (
            <div className="bg-gradient-to-tr from-brand to-brand-dark p-4 rounded-2xl text-white space-y-3 shadow-sm">
              <div>
                <p className="text-xs font-bold tracking-wider uppercase opacity-85">{t.proBannerTitle}</p>
                <p className="text-[10px] mt-1 opacity-90">{t.proBannerDesc}</p>
              </div>
              <Link
                href="/billing"
                className="block text-center w-full bg-white text-brand text-[10px] font-bold py-2 rounded-lg hover:bg-brand-light transition-all active:scale-95 shadow-sm"
              >
                {t.upgrade}
              </Link>
            </div>
          )}

          {/* User profile row (Interactive!) */}
          <div 
            onClick={handleOpenProfileModal}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-150 transition-all ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={t.profileSettings}
          >
            <div className="h-9 w-9 rounded-full bg-brand/10 text-brand flex items-center justify-center font-extrabold text-sm shrink-0 border border-brand/20">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="truncate text-left flex-1">
                <p className="text-xs font-bold text-surface-dark truncate">
                  {profile?.full_name || "Student"}
                </p>
                <p className="text-[10px] text-gray-400 font-semibold truncate">
                  {profile?.plan === "founding" ? t.foundingBadge : isPro ? t.proBadge : t.freeBadge}
                </p>
              </div>
            )}
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={isCollapsed ? t.signout : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && t.signout}
          </button>
        </div>
      </aside>

      {/* Edit Profile Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-surface-dark/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-lg border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-sm text-surface-dark flex items-center gap-2">
                <Settings className="text-brand animate-spin" size={16} /> {t.profileSettings}
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-xs text-gray-400 hover:text-surface-dark transition-all cursor-pointer font-bold"
              >
                {t.close}
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.fullName}</label>
                <input
                   type="text"
                   required
                   value={editName}
                   onChange={(e) => setEditName(e.target.value)}
                   placeholder="e.g. John Doe"
                   className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                <input
                   type="email"
                   required
                   value={editEmail}
                   onChange={(e) => setEditEmail(e.target.value)}
                   placeholder="e.g. alex@school.com"
                   className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.gradeLevel}</label>
                <input
                  type="text"
                  required
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  placeholder="e.g. 10th Grade / AP Prep"
                  className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.studyGoal}</label>
                  <input
                    type="number"
                    required
                    min={15}
                    max={480}
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.language}</label>
                  <select
                    value={editLang}
                    onChange={(e) => setEditLang(e.target.value)}
                    className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white cursor-pointer font-semibold"
                  >
                    <option value="en">🇬🇧 English (US)</option>
                    <option value="tr">🇹🇷 Türkçe</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="zh">🇨🇳 中文 (简体)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1.5 pb-1">
                <input
                  type="checkbox"
                  id="emailNotifsToggle"
                  checked={editEmailNotifications}
                  onChange={(e) => setEditEmailNotifications(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer accent-brand"
                />
                <label htmlFor="emailNotifsToggle" className="text-[11px] font-semibold text-gray-600 cursor-pointer">
                  {editLang === "tr" ? "E-posta Duyurularına ve Kampanyalara İzin Ver" : "Receive Email Announcements & Updates"}
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                      <CheckCircle2 size={10} /> {t.saved}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                >
                  {savingProfile && <Loader2 className="h-3 w-3 animate-spin" />}
                  {savingProfile ? t.saving : t.save}
                </button>
              </div>
            </form>

            <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Google Calendar Sync</span>
                <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-extrabold ${googleConnected ? "bg-green-50 text-green-500 border border-green-100" : "bg-gray-100 text-gray-400"}`}>
                  {googleConnected ? "Connected" : "Not Linked"}
                </span>
              </div>
              
              {googleConnected ? (
                <div className="flex items-center justify-between p-3 border border-emerald-100 bg-emerald-50/20 rounded-2xl text-xs gap-3">
                  <div className="truncate text-left flex-1">
                    <p className="font-bold text-surface-dark truncate">Google Sync Active</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{googleEmail}</p>
                  </div>
                  <button
                    onClick={handleDisconnectGoogle}
                    disabled={isSyncingGoogle}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-red-500 hover:bg-red-50 text-[10px] font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleRealGoogleOAuth}
                    disabled={isSyncingGoogle}
                    className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-[10px] shadow-sm active:scale-95 transition-all cursor-pointer flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Connect Google Account
                  </button>
                  <p className="text-[9px] text-gray-400 text-center leading-normal">
                    Connects your Google Calendar. Any Google account works — even a different email.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
