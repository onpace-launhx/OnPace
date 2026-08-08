"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { clearRememberSessionIntent } from "@/lib/auth/remember-session";
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
  Users,
  AlertCircle,
  TriangleAlert,
  Target,
  Check
} from "lucide-react";
import html2canvas from "html2canvas";

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
    emailVerificationSent: "A 6-digit code was sent to your new email.",
    emailChangeCode: "Email change code",
    emailChangeVerify: "Verify email",
    emailChangeVerifying: "Verifying...",
    emailChangeSuccess: "Your email was changed successfully.",
    emailChangeInvalid: "The code is invalid or expired.",
    emailConsent: "Receive email announcements, feature updates, and campaigns",
    proBannerTitle: "Go Premium",
    proBannerDesc: "Unlock AI planner, quizzes & advanced metrics.",
    upgrade: "Upgrade to Pro",
    proBadge: "Pro Member",
    foundingBadge: "Founding Member",
    freeBadge: "Free Member",
    studyGroups: "Study Groups",
    billing: "Subscription & Billing",
    profileSocial: "Profile & Social",
    emailAddress: "Email address",
    googleCalendarSync: "Google Calendar Sync",
    connected: "Connected",
    notLinked: "Not linked",
    googleSyncActive: "Google Sync Active",
    disconnect: "Disconnect",
    connectGoogle: "Connect Google Account",
    planAndPromocode: "Plan & promo code",
    activeCode: "Active code",
    expires: "Expires:",
    promoCodePlaceholder: "ENTER PROMO CODE",
    redeem: "Redeem",
    removePromocode: "Remove promo code",
    promoRemoved: "Promo code removed.",
    removePromoConfirm: "Do you want to remove this active promo code and its plan benefits?",
    expandSidebar: "Expand navigation",
    collapseSidebar: "Collapse navigation",
    openNavigation: "Open navigation menu",
    closeNavigation: "Close navigation menu"
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
    emailVerificationSent: "Se envió un código de 6 dígitos a tu nuevo correo.",
    emailChangeCode: "Código de cambio de correo",
    emailChangeVerify: "Verificar correo",
    emailChangeVerifying: "Verificando...",
    emailChangeSuccess: "Tu correo se cambió correctamente.",
    emailChangeInvalid: "El código no es válido o ha caducado.",
    emailConsent: "Recibir anuncios, novedades y campañas por correo",
    proBannerTitle: "Hacerse Premium",
    proBannerDesc: "Desbloquea planificador de IA, exámenes y métricas.",
    upgrade: "Actualizar a Pro",
    proBadge: "Miembro Pro",
    foundingBadge: "Miembro Fundador",
    freeBadge: "Miembro Gratis",
    studyGroups: "Grupos de Estudio",
    billing: "Suscripción y Facturación",
    profileSocial: "Perfil y Espacio Social",
    emailAddress: "Correo electrónico",
    googleCalendarSync: "Sincronización con Google Calendar",
    connected: "Conectado",
    notLinked: "Sin vincular",
    googleSyncActive: "Sincronización de Google activa",
    disconnect: "Desconectar",
    connectGoogle: "Conectar cuenta de Google",
    planAndPromocode: "Plan y código promocional",
    activeCode: "Código activo",
    expires: "Vence:",
    promoCodePlaceholder: "INTRODUCE EL CÓDIGO",
    redeem: "Canjear",
    removePromocode: "Eliminar código promocional",
    promoRemoved: "Código promocional eliminado.",
    removePromoConfirm: "¿Quieres eliminar este código promocional activo y sus ventajas del plan?",
    expandSidebar: "Expandir navegación",
    collapseSidebar: "Contraer navegación",
    openNavigation: "Abrir menú de navegación",
    closeNavigation: "Cerrar menú de navegación"
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
    emailVerificationSent: "6 位验证码已发送到您的新邮箱。",
    emailChangeCode: "邮箱变更验证码",
    emailChangeVerify: "验证邮箱",
    emailChangeVerifying: "正在验证...",
    emailChangeSuccess: "您的邮箱已成功更改。",
    emailChangeInvalid: "验证码无效或已过期。",
    emailConsent: "接收电子邮件公告、功能更新和活动",
    proBannerTitle: "解锁高级版",
    proBannerDesc: "开启AI学习计划、智能测验与专属数据分析。",
    upgrade: "升级到Pro",
    proBadge: "Pro 专业版会员",
    foundingBadge: "创始会员",
    freeBadge: "免费版用户",
    studyGroups: "学习小组",
    billing: "订阅与账单",
    profileSocial: "个人资料与社交",
    emailAddress: "电子邮箱地址",
    googleCalendarSync: "Google 日历同步",
    connected: "已连接",
    notLinked: "未关联",
    googleSyncActive: "Google 同步已启用",
    disconnect: "断开连接",
    connectGoogle: "连接 Google 账户",
    planAndPromocode: "套餐与优惠码",
    activeCode: "已启用的代码",
    expires: "到期：",
    promoCodePlaceholder: "输入优惠码",
    redeem: "兑换",
    removePromocode: "移除优惠码",
    promoRemoved: "优惠码已移除。",
    removePromoConfirm: "要移除此优惠码及其套餐权益吗？",
    expandSidebar: "展开导航",
    collapseSidebar: "收起导航",
    openNavigation: "打开导航菜单",
    closeNavigation: "关闭导航菜单"
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
    emailVerificationSent: "Yeni e-posta adresinize 6 haneli kod gönderildi.",
    emailChangeCode: "E-posta değişiklik kodu",
    emailChangeVerify: "E-postayı doğrula",
    emailChangeVerifying: "Doğrulanıyor...",
    emailChangeSuccess: "E-posta adresiniz başarıyla değiştirildi.",
    emailChangeInvalid: "Kod geçersiz veya süresi dolmuş.",
    emailConsent: "E-posta duyurularına, özellik haberlerine ve kampanyalara izin ver",
    proBannerTitle: "Premium'a Geç",
    proBannerDesc: "Yapay zeka planlayıcı, quizler ve gelişmiş metrikleri aç.",
    upgrade: "Pro Plana Yükselt",
    proBadge: "Pro Üye",
    foundingBadge: "Kurucu Üye",
    freeBadge: "Ücretsiz Üye",
    studyGroups: "Çalışma Grupları",
    billing: "Abonelik ve Faturalandırma",
    profileSocial: "Profil ve Sosyal Alan",
    emailAddress: "E-posta adresi",
    googleCalendarSync: "Google Takvim senkronizasyonu",
    connected: "Bağlı",
    notLinked: "Bağlı değil",
    googleSyncActive: "Google senkronizasyonu aktif",
    disconnect: "Bağlantıyı kes",
    connectGoogle: "Google hesabını bağla",
    planAndPromocode: "Plan ve promosyon kodu",
    activeCode: "Aktif kod",
    expires: "Bitiş:",
    promoCodePlaceholder: "PROMOSYON KODUNU GİR",
    redeem: "Kullan",
    removePromocode: "Promosyon kodunu kaldır",
    promoRemoved: "Promosyon kodu kaldırıldı.",
    removePromoConfirm: "Aktif promosyon kodunu ve buna bağlı plan avantajlarını kaldırmak istiyor musunuz?",
    expandSidebar: "Menüyü genişlet",
    collapseSidebar: "Menüyü daralt",
    openNavigation: "Navigasyon menüsünü aç",
    closeNavigation: "Navigasyon menüsünü kapat"
  }
};

const bugReportTranslations: Record<string, Record<string, string>> = {
  en: {
    title: "Report a Problem",
    descriptionLabel: "What went wrong?",
    placeholder: "For example: Calendar items do not load after I add a task...",
    submit: "Send report",
    submitting: "Sending...",
    successTitle: "Your report has been received",
    successMessage: "Thank you. We will review the problem as soon as possible.",
    trackingNumber: "Tracking number",
    thankYouButton: "Thank you for your bug report",
    error: "The report could not be sent. Please try again.",
  },
  tr: {
    title: "Hata Bildir",
    descriptionLabel: "Karşılaştığınız sorun nedir?",
    placeholder: "Örneğin: Bir görev ekledikten sonra takvim öğeleri yüklenmiyor...",
    submit: "Hata bildirimini gönder",
    submitting: "Gönderiliyor...",
    successTitle: "Bildiriminiz alındı",
    successMessage: "Sorunu en kısa sürede inceleyeceğiz.",
    trackingNumber: "Takip numarası",
    thankYouButton: "Hata bildiriminiz için teşekkürler",
    error: "Bildirim gönderilemedi. Lütfen tekrar deneyin.",
  },
  es: {
    title: "Informar de un problema",
    descriptionLabel: "¿Qué problema encontraste?",
    placeholder: "Por ejemplo: Los elementos del calendario no cargan después de añadir una tarea...",
    submit: "Enviar informe",
    submitting: "Enviando...",
    successTitle: "Hemos recibido tu informe",
    successMessage: "Gracias. Revisaremos el problema lo antes posible.",
    trackingNumber: "Número de seguimiento",
    thankYouButton: "Gracias por informar del error",
    error: "No se pudo enviar el informe. Inténtalo de nuevo.",
  },
  zh: {
    title: "报告问题",
    descriptionLabel: "你遇到了什么问题？",
    placeholder: "例如：添加任务后，日历项目无法加载……",
    submit: "发送报告",
    submitting: "正在发送……",
    successTitle: "我们已收到你的报告",
    successMessage: "谢谢，我们会尽快检查这个问题。",
    trackingNumber: "跟踪编号",
    thankYouButton: "感谢你的错误报告",
    error: "报告发送失败，请重试。",
  },
};

function getEmailUpdateErrorMessage(error: unknown) {
  const rawMessage =
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : error;
  const message = typeof rawMessage === "string" ? rawMessage : "";

  if (!message || message === "{}" || message === "[object Object]") {
    return "E-posta doğrulama isteği gönderilemedi. Supabase Send Email Hook, Resend anahtarı ve gönderen domain ayarlarını kontrol edin.";
  }
  if (message.includes("Resend is not configured")) {
    return "Resend yapılandırılmamış. Yönetici panelinden Resend API anahtarını ve gönderen adresini kaydedin.";
  }
  if (message.includes("SEND_EMAIL_HOOK_SECRET")) {
    return "Supabase Send Email Hook gizli anahtarı yapılandırılmamış.";
  }

  return message;
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Collapsible sidebar state (persisted locally)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailChangeCode, setEmailChangeCode] = useState("");
  const [verifyingEmailChange, setVerifyingEmailChange] = useState(false);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Google Calendar Integration Settings inside Sidebar
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);

  // Bug Report Modal States
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugDesc, setBugDesc] = useState("");
  const [submittingBug, setSubmittingBug] = useState(false);
  const [bugSubmitted, setBugSubmitted] = useState(false);
  const [bugTrackingNumber, setBugTrackingNumber] = useState<string | null>(null);
  const [bugError, setBugError] = useState<string | null>(null);
  const screenshotCaptureRef = useRef<Promise<string | null> | null>(null);

  // Promocode Form States inside Profile Modal
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoMsg, setPromoMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleOpenBugModal = () => {
    setShowBugModal(true);
    setBugSubmitted(false);
    setBugTrackingNumber(null);
    setBugError(null);
    setBugDesc("");

    screenshotCaptureRef.current = new Promise((resolve) => {
      requestAnimationFrame(async () => {
        try {
          const targetElement = document.documentElement || document.body;
          const canvas = await html2canvas(targetElement, {
            useCORS: true,
            allowTaint: false,
            logging: false,
            scale: Math.min(window.devicePixelRatio || 1, 1),
            imageTimeout: 3_000,
            ignoreElements: (element) => element.id === "bug-report-modal",
          });
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        } catch {
          resolve(null);
        }
      });
    });
  };

  const handleSubmitBugReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugDesc.trim()) return;
    setSubmittingBug(true);
    setBugError(null);

    try {
      const screenshotBase64 = screenshotCaptureRef.current
        ? await screenshotCaptureRef.current
        : null;
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: bugDesc.trim(),
          pageUrl: window.location.href,
          screenshotBase64: screenshotBase64
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBugSubmitted(true);
        setBugTrackingNumber(typeof data.trackingNumber === "string" ? data.trackingNumber : null);
        setBugDesc("");
      } else {
        setBugError(
          typeof data?.error === "string" ? data.error : "REPORT_FAILED"
        );
      }
    } catch {
      setBugError("REPORT_FAILED");
    } finally {
      setSubmittingBug(false);
    }
  };

  const handleApplyPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;
    setApplyingPromo(true);
    setPromoMsg(null);

    try {
      const res = await fetch("/api/promocode/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCodeInput.trim() })
      });
      const data = await res.json();
      if (data.error) {
        setPromoMsg({ text: data.error, error: true });
      } else {
        setPromoMsg({ text: data.message, error: false });
        setPromoCodeInput("");
        const { data: updated } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (updated) setProfile(updated);
      }
    } catch {
      setPromoMsg({ text: "Error validating promo code.", error: true });
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleCancelPromoCode = async () => {
    if (!profile?.active_promocode || !user?.id) return;
    const confirmed = window.confirm(t.removePromoConfirm);
    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .update({ plan: "free", active_promocode: null, promocode_expires_at: null })
      .eq("id", user.id);
    if (error) {
      setPromoMsg({ text: error.message, error: true });
      return;
    }
    setProfile((current: any) => ({ ...current, plan: "free", active_promocode: null, promocode_expires_at: null }));
    setPromoMsg({ text: t.promoRemoved, error: false });
  };

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
      if (["google", "account"].includes(params.get("settings") || "")) {
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
        .select("id, scope")
        .eq("user_id", user.id)
        .maybeSingle();

      if (googleToken?.scope?.includes("https://www.googleapis.com/auth/calendar")) {
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
    clearRememberSessionIntent();
    window.location.replace("/login");
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
    setEmailVerificationSent(false);
    setEmailChangeCode("");
    setEmailChangeSuccess(false);
    setProfileSaveError(null);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveSuccess(false);
    setProfileSaveError(null);

    const requestedEmail = editEmail.trim().toLowerCase();
    const emailChanged = requestedEmail !== user.email?.toLowerCase();
    const authLanguageChanged = user.user_metadata?.language !== editLang;

    if (authLanguageChanged) {
      const { error: emailError } = await supabase.auth.updateUser({
        data: { ...user.user_metadata, language: editLang },
      });
      if (emailError) {
        setProfileSaveError(getEmailUpdateErrorMessage(emailError));
        setSavingProfile(false);
        return;
      }
    }

    if (emailChanged) {
      const { data: emailData, error: emailError } =
        await supabase.functions.invoke("account-email-change", {
          body: {
            action: "request",
            newEmail: requestedEmail,
            language: editLang,
          },
        });
      if (emailError || emailData?.error) {
        setProfileSaveError(
          getEmailUpdateErrorMessage(emailData?.error || emailError)
        );
        setSavingProfile(false);
        return;
      }
      setEmailVerificationSent(true);
      setEmailChangeCode("");
      setEmailChangeSuccess(false);
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
      if (!emailChanged) {
        setTimeout(() => {
          setSaveSuccess(false);
          setShowProfileModal(false);
          window.location.reload();
        }, 1000);
      }
    } else {
      setProfileSaveError(
        error.message || "Profil ayarları kaydedilemedi."
      );
    }
    setSavingProfile(false);
  };

  const handleVerifyEmailChange = async () => {
    if (emailChangeCode.length !== 6) return;
    setVerifyingEmailChange(true);
    setProfileSaveError(null);
    const requestedEmail = editEmail.trim().toLowerCase();
    const { data, error } = await supabase.functions.invoke(
      "account-email-change",
      {
        body: {
          action: "verify",
          newEmail: requestedEmail,
          token: emailChangeCode,
        },
      }
    );
    if (error || data?.error) {
      setProfileSaveError(
        typeof data?.error === "string" ? data.error : t.emailChangeInvalid
      );
      setVerifyingEmailChange(false);
      return;
    }

    await supabase.auth.refreshSession();
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) setUser(userData.user);
    setEmailVerificationSent(false);
    setEmailChangeSuccess(true);
    setEmailChangeCode("");
    setSaveSuccess(true);
    setVerifyingEmailChange(false);
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
      // Keep synchronized sessions and their remote ids. This preserves local
      // data and prevents duplicate imports if the account is connected again.
      await supabase
        .from("calendar_sync_state")
        .delete()
        .eq("user_id", user.id);

      await supabase
        .from("user_google_tokens")
        .delete()
        .eq("user_id", user.id);

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
  const bugText = bugReportTranslations[lang] || bugReportTranslations.en;

  const navItems = [
    { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard, requiresPro: false },
    { href: "/tasks", label: t.tasks, icon: CheckSquare, requiresPro: false },
    { href: "/calendar", label: t.calendar, icon: Calendar, requiresPro: false },
    { href: "/exam-planner", label: lang === "tr" ? "Sınav Planı" : lang === "zh" ? "考试计划" : lang === "es" ? "Plan de examen" : "Exam Plan", icon: Target, requiresPro: false },
    { href: "/notes", label: t.notes, icon: BookOpen, requiresPro: true },
    { href: "/focus", label: t.focus, icon: Timer, requiresPro: true },
    { href: "/ai-assistant", label: t.ai, icon: Sparkles, requiresPro: true },
    { href: "/study-groups", label: t.studyGroups, icon: Users, requiresPro: true },
    { href: "/profile", label: t.profileSocial, icon: User, requiresPro: false },
    { href: "/billing", label: t.billing, icon: ShieldCheck, requiresPro: false },
    { href: "/achievements", label: t.achievements, icon: Trophy, requiresPro: true },
  ];

  if (loading) {
    return (
      <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-gray-200 bg-white p-6 lg:flex">
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
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/95 text-surface-dark shadow-lg backdrop-blur lg:hidden"
        aria-label={t.openNavigation}
      >
        <Menu size={20} />
      </button>
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-surface-dark/40 backdrop-blur-[2px] lg:hidden"
          aria-label={t.closeNavigation}
        />
      )}
      <aside 
        className={`${mobileOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-50 h-dvh min-h-0 w-64 shrink-0 flex-col justify-between overflow-y-auto overscroll-contain border-r border-gray-200 bg-white p-5 transition-all duration-300 lg:static lg:z-auto lg:flex lg:h-full ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
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
            
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleCollapse}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-surface-dark hover:bg-gray-100 transition-all cursor-pointer ${
                  isCollapsed ? "mx-auto mt-2" : ""
                }`}
                title={isCollapsed ? t.expandSidebar : t.collapseSidebar}
              >
                <Menu size={18} />
              </button>
            </div>
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
                  onClick={() => setMobileOpen(false)}
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
                onClick={() => setMobileOpen(false)}
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

          {/* Report a problem: intentionally placed beside account actions, not navigation. */}
          <button
            type="button"
            onClick={handleOpenBugModal}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all cursor-pointer ${isCollapsed ? "justify-center" : ""}`}
            title={bugText.title}
          >
            <TriangleAlert size={18} className="shrink-0 text-amber-600" />
            {!isCollapsed && <span className="text-xs font-bold">{bugText.title}</span>}
          </button>

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
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.emailAddress}</label>
                <input
                   type="email"
                   required
                   value={editEmail}
                   onChange={(e) => setEditEmail(e.target.value)}
                   disabled={emailVerificationSent}
                   placeholder="e.g. alex@school.com"
                   className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {emailVerificationSent && (
                <div className="rounded-2xl border border-brand/15 bg-brand/5 p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-brand">
                    {t.emailVerificationSent}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={emailChangeCode}
                      onChange={(event) =>
                        setEmailChangeCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder={t.emailChangeCode}
                      className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center text-sm font-extrabold tracking-[0.3em] text-surface-dark outline-none focus:ring-1 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyEmailChange}
                      disabled={
                        verifyingEmailChange || emailChangeCode.length !== 6
                      }
                      className="rounded-xl bg-brand px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                    >
                      {verifyingEmailChange
                        ? t.emailChangeVerifying
                        : t.emailChangeVerify}
                    </button>
                  </div>
                </div>
              )}

              {emailChangeSuccess && (
                <p className="rounded-xl bg-emerald-50 p-3 text-[10px] font-bold text-emerald-600">
                  {t.emailChangeSuccess}
                </p>
              )}

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
                  {t.emailConsent}
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between">
                  <div>
                  {profileSaveError && (
                    <p className="max-w-xs text-[10px] text-red-600 font-bold flex items-start gap-1">
                      <AlertCircle size={10} className="mt-0.5 shrink-0" />
                      {profileSaveError}
                    </p>
                  )}
                  {saveSuccess && (
                    <p className="max-w-xs text-[10px] text-green-500 font-bold flex items-start gap-1">
                      <CheckCircle2 size={10} className="mt-0.5 shrink-0" />
                      {emailVerificationSent ? t.emailVerificationSent : t.saved}
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
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.googleCalendarSync}</span>
                <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-extrabold ${googleConnected ? "bg-green-50 text-green-500 border border-green-100" : "bg-gray-100 text-gray-400"}`}>
                  {googleConnected ? t.connected : t.notLinked}
                </span>
              </div>
              
              {googleConnected ? (
                <div className="flex items-center justify-between p-3 border border-emerald-100 bg-emerald-50/20 rounded-2xl text-xs gap-3">
                  <div className="truncate text-left flex-1">
                    <p className="font-bold text-surface-dark truncate">{t.googleSyncActive}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{googleEmail}</p>
                  </div>
                  <button
                    onClick={handleDisconnectGoogle}
                    disabled={isSyncingGoogle}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-red-500 hover:bg-red-50 text-[10px] font-bold rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {t.disconnect}
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
                    {t.connectGoogle}
                  </button>
                </div>
              )}
            </div>

            {/* Promocode & Subscription Plan Section */}
            <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.planAndPromocode}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold bg-brand/10 text-brand">
                  {profile?.plan || t.freeBadge}
                </span>
              </div>

              {profile?.active_promocode && (
                <div className="rounded-xl border border-brand/15 bg-brand/5 px-3 py-2 text-[10px] text-gray-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>{t.activeCode}</span>
                    <span className="font-extrabold text-brand">{profile.active_promocode}</span>
                  </div>
                  {profile.promocode_expires_at && (
                    <p className="mt-1 text-gray-400">{t.expires} {new Date(profile.promocode_expires_at).toLocaleDateString(profile?.language === "tr" ? "tr-TR" : profile?.language === "es" ? "es-ES" : profile?.language === "zh" ? "zh-CN" : "en-US")}</p>
                  )}
                </div>
              )}

              <form onSubmit={handleApplyPromoCode} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder={t.promoCodePlaceholder}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand uppercase font-bold text-surface-dark bg-white"
                  />
                  <button
                    type="submit"
                    disabled={applyingPromo || !promoCodeInput.trim()}
                    className="px-3 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {applyingPromo ? <Loader2 className="h-3 w-3 animate-spin" /> : t.redeem}
                  </button>
                </div>
                {promoMsg && (
                  <p className={`text-[10px] font-bold ${promoMsg.error ? "text-red-500" : "text-green-600"}`}>
                    {promoMsg.text}
                  </p>
                )}
              </form>
              {profile?.active_promocode && (
                <button type="button" onClick={handleCancelPromoCode} className="w-full rounded-xl border border-red-200 py-2 text-[10px] font-bold text-red-500 transition-colors hover:bg-red-50">
                  {t.removePromocode}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      {showBugModal && (
        <div id="bug-report-modal" className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-500" size={20} />
                <h3 className="font-extrabold text-sm text-surface-dark">
                  {bugText.title}
                </h3>
              </div>
              <button
                onClick={() => setShowBugModal(false)}
                className="text-xs text-gray-400 hover:text-surface-dark font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {bugSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-12 w-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto text-xl font-bold">
                  <Check size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-surface-dark">
                    {bugText.successTitle}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {bugText.successMessage}
                  </p>
                  {bugTrackingNumber && (
                    <div className="mx-auto mt-3 w-fit rounded-xl border border-brand/15 bg-brand/5 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{bugText.trackingNumber}</p>
                      <p className="mt-0.5 font-mono text-sm font-extrabold text-brand">{bugTrackingNumber}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowBugModal(false)}
                  className="w-full py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover cursor-pointer active:scale-95 transition-all mt-4"
                >
                  {bugText.thankYouButton}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitBugReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {bugText.descriptionLabel}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={bugDesc}
                    onChange={(e) => setBugDesc(e.target.value)}
                    placeholder={bugText.placeholder}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white resize-none"
                  />
                </div>

                {bugError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                    {bugText.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingBug || !bugDesc.trim()}
                  className="w-full py-3 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submittingBug ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle size={15} />}
                  {submittingBug ? bugText.submitting : bugText.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
