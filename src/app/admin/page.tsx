"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_LEGAL_DOCUMENTS,
  normalizeLegalDocuments,
  type LegalDocuments,
  type LegalDocumentType,
  type LegalLanguage,
} from "@/lib/legal-documents";
import {
  ArrowLeft,
  User,
  Shield,
  CreditCard,
  Loader2,
  Sparkles,
  CheckCircle2,
  UserCog,
  Key,
  Save,
  Clock,
  Unlock,
  AlertTriangle,
  Terminal,
  RefreshCw,
  PlusCircle,
  Tag,
  Trash2,
  Settings,
  CheckSquare,
  Square,
  Edit,
  Eye,
  X,
  AlertCircle
} from "lucide-react";

interface IntegrationConfigResponse {
  error?: unknown;
  has_gemini?: boolean;
  has_openai?: boolean;
  has_resend?: boolean;
  active_provider?: string;
  email_from_address?: string;
  email_from_name?: string;
  has_r2_access_key?: boolean;
  has_r2_secret_key?: boolean;
  r2_endpoint?: string;
  r2_bucket_name?: string;
  r2_public_url?: string;
}

type MaintenanceLanguage = "en" | "tr" | "es" | "zh";
type MaintenanceContent = Record<MaintenanceLanguage, {
  badge: string;
  title: string;
  description: string;
  coming_title: string;
  coming_items: string[];
  back_soon: string;
}>;

const ADMIN_UI_COPY = {
  en: {
    back: "Back to Dashboard", title: "Administrator Panel", subtitle: "Manage user profiles, promotional discount campaigns, and system parameters.",
    superConsole: "Super Admin Console", subConsole: "Sub-Admin Console", totalStudents: "Total Registered Students", proMembers: "Active Pro Members", proRatio: "Pro Ratio", totalAdmins: "Total Administrators",
  },
  tr: {
    back: "Panele dön", title: "Yönetici Paneli", subtitle: "Kullanıcı profillerini, promosyon kampanyalarını ve sistem ayarlarını yönetin.",
    superConsole: "Süper Yönetici Konsolu", subConsole: "Alt Yönetici Konsolu", totalStudents: "Toplam kayıtlı öğrenci", proMembers: "Aktif Pro üyeler", proRatio: "Pro oranı", totalAdmins: "Toplam yönetici",
  },
  es: {
    back: "Volver al panel", title: "Panel de administración", subtitle: "Gestiona perfiles de usuario, campañas promocionales y parámetros del sistema.",
    superConsole: "Consola de superadministrador", subConsole: "Consola de subadministrador", totalStudents: "Total de estudiantes registrados", proMembers: "Miembros Pro activos", proRatio: "Proporción Pro", totalAdmins: "Total de administradores",
  },
  zh: {
    back: "返回工作台", title: "管理面板", subtitle: "管理用户资料、优惠活动和系统参数。",
    superConsole: "超级管理员控制台", subConsole: "子管理员控制台", totalStudents: "注册学生总数", proMembers: "活跃 Pro 会员", proRatio: "Pro 占比", totalAdmins: "管理员总数",
  },
} as const;

const DEFAULT_MAINTENANCE_CONTENT: MaintenanceContent = {
  en: {
    badge: "Scheduled upgrade in progress",
    title: "We are improving OnPace",
    description: "We are performing planned maintenance to make your study experience faster and more reliable.",
    coming_title: "Coming with this update",
    coming_items: [],
    back_soon: "We will be back shortly.",
  },
  tr: {
    badge: "Planlı güncelleme devam ediyor",
    title: "OnPace’i geliştiriyoruz",
    description: "Çalışma deneyiminizi daha hızlı ve güvenilir hale getirmek için planlı bakım yapıyoruz.",
    coming_title: "Bu güncellemeyle gelecekler",
    coming_items: [],
    back_soon: "Kısa süre içinde tekrar buradayız.",
  },
  es: {
    badge: "Actualización programada en curso",
    title: "Estamos mejorando OnPace",
    description: "Realizamos mantenimiento programado para que tu experiencia de estudio sea más rápida y fiable.",
    coming_title: "Novedades de esta actualización",
    coming_items: [],
    back_soon: "Volveremos muy pronto.",
  },
  zh: {
    badge: "计划更新正在进行",
    title: "我们正在改进 OnPace",
    description: "我们正在进行计划维护，让您的学习体验更快速、更可靠。",
    coming_title: "本次更新内容",
    coming_items: [],
    back_soon: "我们很快回来。",
  },
};

function normalizeMaintenanceContent(value: unknown): MaintenanceContent {
  const source =
    value && typeof value === "object"
      ? value as Partial<Record<MaintenanceLanguage, Partial<MaintenanceContent[MaintenanceLanguage]>>>
      : {};
  return (["en", "tr", "es", "zh"] as MaintenanceLanguage[]).reduce(
    (result, language) => {
      const localized = source[language] || {};
      result[language] = {
        badge: typeof localized.badge === "string" ? localized.badge : DEFAULT_MAINTENANCE_CONTENT[language].badge,
        title: typeof localized.title === "string" ? localized.title : DEFAULT_MAINTENANCE_CONTENT[language].title,
        description: typeof localized.description === "string" ? localized.description : DEFAULT_MAINTENANCE_CONTENT[language].description,
        coming_title: typeof localized.coming_title === "string" ? localized.coming_title : DEFAULT_MAINTENANCE_CONTENT[language].coming_title,
        coming_items: Array.isArray(localized.coming_items)
          ? localized.coming_items.filter((item): item is string => typeof item === "string")
          : [],
        back_soon: typeof localized.back_soon === "string" ? localized.back_soon : DEFAULT_MAINTENANCE_CONTENT[language].back_soon,
      };
      return result;
    },
    {} as MaintenanceContent
  );
}

async function requestIntegrationConfig(
  body?: Record<string, unknown>
): Promise<IntegrationConfigResponse> {
  const response = await fetch("/api/admin/integration-config", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response
    .json()
    .catch(() => ({})) as IntegrationConfigResponse;

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Entegrasyon ayarları kaydedilemedi."
    );
  }

  return data;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUserProfile, setCurrentUserProfile] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  
  // Database datasets
  const [profiles, setProfiles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Moderation & Social feed states
  const [moderationPosts, setModerationPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Announcements & Feedbacks states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annResponses, setAnnResponses] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnType, setNewAnnType] = useState<"announcement" | "feedback">("announcement");
  const [newAnnDisplayType, setNewAnnDisplayType] = useState<"pin" | "popup">("pin");
  const [newAnnQuestionText, setNewAnnQuestionText] = useState("");
  const [newAnnQuestions, setNewAnnQuestions] = useState<any[]>([]);
  const [creatingAnn, setCreatingAnn] = useState(false);
  const [newAnnTargetAudience, setNewAnnTargetAudience] = useState("all");
  const [newAnnTargetFilter, setNewAnnTargetFilter] = useState("");
  // Edit announcement states
  const [editingAnn, setEditingAnn] = useState<any | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState("");
  const [editAnnContent, setEditAnnContent] = useState("");
  const [editAnnType, setEditAnnType] = useState<"announcement" | "feedback">("announcement");
  const [editAnnDisplayType, setEditAnnDisplayType] = useState<"pin" | "popup">("pin");
  const [editAnnTargetAudience, setEditAnnTargetAudience] = useState("all");
  const [editAnnTargetFilter, setEditAnnTargetFilter] = useState("");
  const [savingAnn, setSavingAnn] = useState(false);
  // Detail view state
  const [detailAnn, setDetailAnn] = useState<any | null>(null);

  // AI Config States
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [hasGemini, setHasGemini] = useState(false);
  const [hasOpenai, setHasOpenai] = useState(false);
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [savingKey, setSavingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // R2 Config States
  const [r2AccessKey, setR2AccessKey] = useState("");
  const [r2SecretKey, setR2SecretKey] = useState("");
  const [r2Endpoint, setR2Endpoint] = useState("");
  const [r2BucketName, setR2BucketName] = useState("");
  const [r2PublicUrl, setR2PublicUrl] = useState("");
  const [hasR2AccessKey, setHasR2AccessKey] = useState(false);
  const [hasR2SecretKey, setHasR2SecretKey] = useState(false);
  const [savingR2, setSavingR2] = useState(false);
  const [saveR2Success, setSaveR2Success] = useState(false);

  // Promocode Creation States
  const [newPromoCode, setNewPromoCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "free_trial" | "lifetime">("percentage");
  const [discountValue, setDiscountValue] = useState(20);
  const [maxUses, setMaxUses] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(false);

  // System Settings (Payment, Maintenance, Pricing, Resend)
  const [paymentGatewayEnabled, setPaymentGatewayEnabled] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState("unconfigured");
  const [paymentProviderConfigured, setPaymentProviderConfigured] = useState(false);
  const [disabledMsgTR, setDisabledMsgTR] = useState("");
  const [disabledMsgEN, setDisabledMsgEN] = useState("");
  const [disabledMsgES, setDisabledMsgES] = useState("");
  const [disabledMsgZH, setDisabledMsgZH] = useState("");
  const [proMonthlyPrice, setProMonthlyPrice] = useState(6.99);
  const [proYearlyPrice, setProYearlyPrice] = useState(59.99);
  const [foundingPrice, setFoundingPrice] = useState(99);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceContent, setMaintenanceContent] = useState<MaintenanceContent>(
    DEFAULT_MAINTENANCE_CONTENT
  );
  const [legalDocuments, setLegalDocuments] = useState<LegalDocuments>(
    DEFAULT_LEGAL_DOCUMENTS
  );
  const [legalEditorLanguage, setLegalEditorLanguage] = useState<LegalLanguage>("en");
  const [legalEditorDocument, setLegalEditorDocument] = useState<LegalDocumentType>("privacy");
  const [resendApiKey, setResendApiKey] = useState("");
  const [hasResend, setHasResend] = useState(false);
  const [emailFromAddress] = useState("no-reply@onpace-ai.xyz");
  const [emailFromName, setEmailFromName] = useState("OnPace");
  const [savingSystemSettings, setSavingSystemSettings] = useState(false);
  const [saveSystemSettingsSuccess, setSaveSystemSettingsSuccess] = useState(false);
  const [systemSettingsError, setSystemSettingsError] = useState<string | null>(null);

  // Email Broadcast Tool States
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailSubjectTR, setEmailSubjectTR] = useState("");
  const [emailContentTR, setEmailContentTR] = useState("");
  const [emailSubjectES, setEmailSubjectES] = useState("");
  const [emailContentES, setEmailContentES] = useState("");
  const [emailSubjectZH, setEmailSubjectZH] = useState("");
  const [emailContentZH, setEmailContentZH] = useState("");
  const [emailIsMandatory, setEmailIsMandatory] = useState(false);
  const [emailSendEmail, setEmailSendEmail] = useState(true);
  const [emailSendInApp, setEmailSendInApp] = useState(true);
  const [emailTargetPlan, setEmailTargetPlan] = useState("all");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [translatingEmail, setTranslatingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  // Bug Reports Tab States
  const [bugReports, setBugReports] = useState<any[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(false);
  const [bugFilterCode, setBugFilterCode] = useState("all");
  const [selectedBugScreenshot, setSelectedBugScreenshot] = useState<string | null>(null);

  // Adjust Plan Modal States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [trialDuration, setTrialDuration] = useState("7"); // "7", "30", "lifetime", "free", "custom"
  const [customTrialDays, setCustomTrialDays] = useState("14");
  const [adjustGraceDays, setAdjustGraceDays] = useState(0);
  const [adjustFailedAttempts, setAdjustFailedAttempts] = useState(0);
  const [adjustNextBilling, setAdjustNextBilling] = useState("");

  // Viewing User Billing Details States
  const [viewingBillingDetails, setViewingBillingDetails] = useState<any | null>(null);
  const [userPurchaseHistory, setUserPurchaseHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Global Billing Settings States
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(3);
  const [globalGraceDays, setGlobalGraceDays] = useState(3);
  const [savingBillingRules, setSavingBillingRules] = useState(false);
  const [saveBillingRulesSuccess, setSaveBillingRulesSuccess] = useState(false);

  // Edit Roles & Permissions Modal States
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingUserRole, setEditingUserRole] = useState("student");
  const [editingUserPermissions, setEditingUserPermissions] = useState<string[]>([]);
  const [editingMaintenanceAccess, setEditingMaintenanceAccess] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Edit Student Profile Modal States
  const [profileEditUser, setProfileEditUser] = useState<any | null>(null);
  const [profileEditName, setProfileEditName] = useState("");
  const [profileEditGrade, setProfileEditGrade] = useState("");
  const [profileEditEmail, setProfileEditEmail] = useState("");
  const [profileEditDiscount, setProfileEditDiscount] = useState(0);
  const [savingStudentProfile, setSavingStudentProfile] = useState(false);

  // Edit Promo Code Modal States
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [editingPromoCode, setEditingPromoCode] = useState("");
  const [editingPromoDiscountType, setEditingPromoDiscountType] = useState<"percentage" | "free_trial" | "lifetime">("percentage");
  const [editingPromoDiscountValue, setEditingPromoDiscountValue] = useState(0);
  const [editingPromoMaxUses, setEditingPromoMaxUses] = useState("");
  const [editingPromoStartDate, setEditingPromoStartDate] = useState("");
  const [editingPromoEndDate, setEditingPromoEndDate] = useState("");
  const [savingPromo, setSavingPromo] = useState(false);

  useEffect(() => {
    async function loadAdminData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Admin Page check error:", profileError);
        alert("Failed to load profile in Admin check: " + (profileError.message || JSON.stringify(profileError)));
        router.push("/dashboard");
        return;
      }

      if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
        console.warn("Unauthorized access attempt. Role:", profile?.role);
        alert("Unauthorized: Your role is '" + (profile?.role || "none") + "' which is not admin or super_admin.");
        router.push("/dashboard");
        return;
      }

      setCurrentUserProfile(profile);

      // Determine initial tab based on permissions
      const isSuperAdmin = profile.role === "super_admin";
      const perms = profile.permissions || [];
      if (isSuperAdmin || perms.includes("manage_users")) {
        setActiveTab("users");
      } else if (perms.includes("manage_promocodes")) {
        setActiveTab("promocodes");
      } else if (perms.includes("manage_settings")) {
        setActiveTab("config");
      } else if (perms.includes("manage_communications")) {
        setActiveTab("announcements");
      } else if (perms.includes("view_logs")) {
        setActiveTab("logs");
      }

      // Fetch all required data based on roles/perms
      fetchProfiles();
      fetchSettings();
      fetchLogs();
      fetchPromocodes();
      fetchModerationPosts();
      fetchAnnouncementsData();
      fetchBugReports();
      
      setLoading(false);
    }
    loadAdminData();
  }, [router, supabase]);

  async function fetchModerationPosts() {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setModerationPosts(data);
    }
    setLoadingPosts(false);
  }

  async function fetchAnnouncementsData() {
    const { data: annData, error: annErr } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (!annErr && annData) {
      setAnnouncements(annData);
    }

    const { data: respData, error: respErr } = await supabase
      .from("announcement_responses")
      .select("*, profiles(full_name), announcements(title)")
      .order("created_at", { ascending: false });
    if (!respErr && respData) {
      setAnnResponses(respData);
    }
  }

  async function fetchProfiles() {
    const { data, error } = await supabase
      .rpc("get_profiles_with_emails");
    
    if (!error && data) {
      setProfiles(data);
    } else {
      console.warn("RPC get_profiles_with_emails failed, falling back to profiles table select:", error);
      // Alert the exact error to the user so they can diagnose database function setup
      if (error && error.message) {
        alert("Email retrieval warning: " + error.message + " (Running profiles table fallback without emails)");
      }
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      
      if (!fallbackError && fallbackData) {
        setProfiles(fallbackData);
      }
    }
  }

  async function fetchSettings() {
    try {
      const integrationData = await requestIntegrationConfig();
      setHasGemini(integrationData.has_gemini || false);
      setHasOpenai(integrationData.has_openai || false);
      setHasResend(integrationData.has_resend || false);
      setActiveProvider(integrationData.active_provider || "gemini");
      setEmailFromName(integrationData.email_from_name || "OnPace");
      setHasR2AccessKey(integrationData.has_r2_access_key || false);
      setHasR2SecretKey(integrationData.has_r2_secret_key || false);
      setR2Endpoint(integrationData.r2_endpoint || "");
      setR2BucketName(integrationData.r2_bucket_name || "");
      setR2PublicUrl(integrationData.r2_public_url || "");
    } catch {
      // Public system settings below can still be loaded when integrations fail.
    }

    // Fetch global system settings (Payment, Maintenance, Pricing, Resend)
    const { data: sysRows } = await supabase.rpc(
      "get_public_system_settings"
    );
    const sysData = Array.isArray(sysRows) ? sysRows[0] : sysRows;

    if (sysData) {
      setPaymentGatewayEnabled(sysData.payment_gateway_enabled || false);
      setPaymentProvider(sysData.payment_provider || "unconfigured");
      setPaymentProviderConfigured(
        sysData.payment_provider_configured === true
      );
      setDisabledMsgTR(sysData.payment_disabled_message?.tr || "");
      setDisabledMsgEN(sysData.payment_disabled_message?.en || "");
      setProMonthlyPrice(sysData.plan_prices?.pro_monthly ?? sysData.plan_prices?.pro ?? 6.99);
      setProYearlyPrice(sysData.plan_prices?.pro_yearly ?? 59.99);
      setFoundingPrice(sysData.plan_prices?.founding_member ?? sysData.plan_prices?.founding ?? 99);
      setMaintenanceMode(sysData.maintenance_mode || false);
      setMaintenanceContent(
        normalizeMaintenanceContent(sysData.maintenance_content)
      );
      setLegalDocuments(normalizeLegalDocuments(sysData.legal_documents));
      setDisabledMsgES(sysData.payment_disabled_message?.es || "");
      setDisabledMsgZH(sysData.payment_disabled_message?.zh || "");
      setMaxFailedAttempts(sysData.max_failed_payment_attempts ?? 3);
      setGlobalGraceDays(sysData.global_grace_days ?? 3);
    }
  }

  const handleSaveSystemSettings = async () => {
    setSavingSystemSettings(true);
    setSaveSystemSettingsSuccess(false);
    setSystemSettingsError(null);

    try {
      const { error: maintenanceError } = await supabase.rpc(
        "admin_update_maintenance_settings",
        {
          p_enabled: maintenanceMode,
          p_content: maintenanceContent,
        }
      );
      if (maintenanceError) {
        throw new Error(maintenanceError.message);
      }
      const { error: legalDocumentsError } = await supabase.rpc(
        "admin_update_legal_documents",
        {
          p_documents: legalDocuments,
        }
      );
      if (legalDocumentsError) {
        throw new Error(legalDocumentsError.message);
      }

      const data = await requestIntegrationConfig({
        paymentGatewayEnabled:
          paymentProviderConfigured && paymentGatewayEnabled,
        maintenanceMode,
        maintenanceContent,
        planPrices: {
          pro_monthly: Number(proMonthlyPrice),
          pro_yearly: Number(proYearlyPrice),
          founding_member: Number(foundingPrice),
        },
        paymentDisabledMessage: {
          tr: disabledMsgTR.trim(),
          en: disabledMsgEN.trim(),
          es: disabledMsgES.trim(),
          zh: disabledMsgZH.trim(),
        },
        resendApiKey: resendApiKey.trim() || undefined,
        emailFromAddress: emailFromAddress.trim(),
        emailFromName: emailFromName.trim(),
      });

      setHasResend(data.has_resend || hasResend);
      setResendApiKey("");
      setSaveSystemSettingsSuccess(true);
      setTimeout(() => setSaveSystemSettingsSuccess(false), 3000);
    } catch (error) {
      setSystemSettingsError(
        error instanceof Error
          ? error.message
          : "Sistem ayarları kaydedilemedi."
      );
    } finally {
      setSavingSystemSettings(false);
    }
  };

  const handleMaintenanceModeChange = async (enabled: boolean) => {
    const previous = maintenanceMode;
    setMaintenanceMode(enabled);
    setSavingSystemSettings(true);
    setSystemSettingsError(null);
    try {
      const { error } = await supabase.rpc(
        "admin_update_maintenance_settings",
        {
          p_enabled: enabled,
          p_content: maintenanceContent,
        }
      );
      if (error) throw new Error(error.message);
      setSaveSystemSettingsSuccess(true);
      setTimeout(() => setSaveSystemSettingsSuccess(false), 3000);
    } catch (error) {
      setMaintenanceMode(previous);
      setSystemSettingsError(
        error instanceof Error
          ? error.message
          : "Bakım modu değiştirilemedi."
      );
    } finally {
      setSavingSystemSettings(false);
    }
  };

  const updateLegalDocumentField = (
    field: keyof LegalDocuments[LegalDocumentType][LegalLanguage],
    value: string
  ) => {
    setLegalDocuments((current) => ({
      ...current,
      [legalEditorDocument]: {
        ...current[legalEditorDocument],
        [legalEditorLanguage]: {
          ...current[legalEditorDocument][legalEditorLanguage],
          [field]: value,
        },
      },
    }));
  };

  async function fetchLogs() {
    const { data, error } = await supabase
      .from("system_logs")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setLogs(data);
    }
  }

  async function fetchBugReports() {
    setLoadingBugs(true);
    const { data, error } = await supabase
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBugReports(data);
    }
    setLoadingBugs(false);
  }

  const handleUpdateBugStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from("bug_reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (!error) {
      setBugReports((prev) =>
        prev.map((b) => (b.id === reportId ? { ...b, status: newStatus } : b))
      );
    } else {
      alert("Failed to update status: " + error.message);
    }
  };

  const handleDeleteBugReport = async (reportId: string) => {
    if (!window.confirm("Bu hata bildirimini kalıcı olarak silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("bug_reports").delete().eq("id", reportId);
    if (error) {
      alert("Hata bildirimi silinemedi: " + error.message);
      return;
    }
    setBugReports((previous) => previous.filter((report) => report.id !== reportId));
  };

  async function fetchPromocodes() {
    const { data, error } = await supabase
      .from("promocodes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPromocodes(data);
    }
  }

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setSaveSuccess(false);
    setSystemSettingsError(null);

    try {
      await requestIntegrationConfig({
        geminiKey: geminiKey.trim() || undefined,
        openaiKey: openaiKey.trim() || undefined,
        activeProvider,
      });
      setSaveSuccess(true);
      setGeminiKey("");
      setOpenaiKey("");
      fetchSettings();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSystemSettingsError(
        error instanceof Error ? error.message : "AI ayarları kaydedilemedi."
      );
    }
    setSavingKey(false);
  };

  const handleSaveR2Settings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingR2(true);
    setSaveR2Success(false);
    setSystemSettingsError(null);

    try {
      const data = await requestIntegrationConfig({
        r2AccessKey: r2AccessKey.trim() || undefined,
        r2SecretKey: r2SecretKey.trim() || undefined,
        r2Endpoint: r2Endpoint.trim(),
        r2BucketName: r2BucketName.trim(),
        r2PublicUrl: r2PublicUrl.trim(),
      });
      setSaveR2Success(true);
      setR2AccessKey("");
      setR2SecretKey("");
      setHasR2AccessKey(data?.has_r2_access_key || hasR2AccessKey);
      setHasR2SecretKey(data?.has_r2_secret_key || hasR2SecretKey);
      fetchSettings();
      setTimeout(() => setSaveR2Success(false), 3000);
    } catch (error) {
      setSystemSettingsError(
        error instanceof Error ? error.message : "R2 ayarları kaydedilemedi."
      );
    }
    setSavingR2(false);
  };

  // Open Adjust Access Modal
  const handleOpenAdjustAccess = (user: any) => {
    setSelectedUser(user);
    setTrialDuration(user.plan === "free" ? "free" : (user.trial_ends_at ? "custom" : "lifetime"));
    setCustomTrialDays("14");
    setAdjustGraceDays(user.grace_days_granted || 0);
    setAdjustFailedAttempts(user.failed_payment_attempts || 0);
    setAdjustNextBilling(user.next_billing_date ? new Date(user.next_billing_date).toISOString().slice(0, 16) : "");
  };

  const handleUpdatePlan = async () => {
    if (!selectedUser) return;
    setUpdatingId(selectedUser.id);

    let nextPlan = "free";
    let expiresAt: string | null = null;

    if (trialDuration !== "free") {
      nextPlan = "pro";
      if (trialDuration === "7") {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (trialDuration === "30") {
        expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (trialDuration === "custom") {
        const days = Number(customTrialDays) || 14;
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      } else {
        expiresAt = null; // Lifetime
      }
    }

    const targetNextBilling = adjustNextBilling.trim() ? new Date(adjustNextBilling).toISOString() : null;

    // Call dynamic self-contained plan update RPC v2
    const { error } = await supabase.rpc("update_student_plan_admin_v2", {
      target_user_id: selectedUser.id,
      target_plan: nextPlan,
      target_expires_at: expiresAt,
      target_grace_days: Number(adjustGraceDays),
      target_failed_attempts: Number(adjustFailedAttempts),
      target_next_billing: targetNextBilling
    });

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === selectedUser.id 
          ? { 
              ...p, 
              plan: nextPlan, 
              trial_ends_at: expiresAt,
              grace_days_granted: Number(adjustGraceDays),
              failed_payment_attempts: Number(adjustFailedAttempts),
              next_billing_date: targetNextBilling
            } 
          : p
      ));
    } else {
      alert("Failed to update plan: " + error.message);
    }

    setUpdatingId(null);
    setSelectedUser(null);
  };

  // Open Billing Details & Transaction History Modal
  const handleOpenBillingDetails = async (user: any) => {
    setViewingBillingDetails(user);
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("purchase_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setUserPurchaseHistory(data);
    } else {
      setUserPurchaseHistory([]);
    }
    setLoadingHistory(false);
  };

  // Save Global Billing Settings Handler
  const handleSaveBillingRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBillingRules(true);
    setSaveBillingRulesSuccess(false);
    setSystemSettingsError(null);

    try {
      await requestIntegrationConfig({
        maxFailedPaymentAttempts: Number(maxFailedAttempts),
        globalGraceDays: Number(globalGraceDays),
      });
      setSaveBillingRulesSuccess(true);
      setTimeout(() => setSaveBillingRulesSuccess(false), 3000);
    } catch (error) {
      setSystemSettingsError(
        error instanceof Error
          ? error.message
          : "Ödeme kuralları kaydedilemedi."
      );
    }
    setSavingBillingRules(false);
  };

  // Open Edit User Role/Perms Modal
  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setEditingUserRole(user.role || "student");
    setEditingUserPermissions(user.permissions || []);
    setEditingMaintenanceAccess(user.maintenance_access === true);
  };

  // Save User Role/Perms Modal Changes
  const handleSaveUserPermissions = async () => {
    if (!editingUser) return;
    setSavingPermissions(true);

    const targetPermissions = editingUserRole === "admin" ? editingUserPermissions : [];

    const { error } = await supabase
      .from("profiles")
      .update({
        role: editingUserRole,
        permissions: targetPermissions,
        maintenance_access: editingMaintenanceAccess
      })
      .eq("id", editingUser.id);

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === editingUser.id 
          ? {
              ...p,
              role: editingUserRole,
              permissions: targetPermissions,
              maintenance_access: editingMaintenanceAccess,
            }
          : p
      ));
      setEditingUser(null);
    } else {
      alert(error.message || "Failed to update user permissions.");
    }
    setSavingPermissions(false);
  };

  const togglePermissionCheckbox = (perm: string) => {
    if (editingUserPermissions.includes(perm)) {
      setEditingUserPermissions(editingUserPermissions.filter(p => p !== perm));
    } else {
      setEditingUserPermissions([...editingUserPermissions, perm]);
    }
  };

  // Create Promo Code Handler
  const handleCreatePromocode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim() || !startDate || !endDate) return;
    setCreatingPromo(true);
    setPromoSuccess(false);

    const payload = {
      code: newPromoCode.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_uses: maxUses.trim() ? Number(maxUses) : null,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString()
    };

    const { data, error } = await supabase
      .from("promocodes")
      .insert([payload])
      .select("*")
      .single();

    if (!error && data) {
      setPromoSuccess(true);
      setPromocodes([data, ...promocodes]);
      setNewPromoCode("");
      setMaxUses("");
      setTimeout(() => setPromoSuccess(false), 3000);
    } else {
      alert(error?.message || "Failed to create promo code.");
    }
    setCreatingPromo(false);
  };

  // Delete Promo Code Handler
  const handleDeletePromocode = async (id: string) => {
    const { error } = await supabase.from("promocodes").delete().eq("id", id);
    if (!error) {
      setPromocodes(promocodes.filter(p => p.id !== id));
    } else {
      alert("Failed to delete promo code: " + error.message);
    }
  };

  // Open Edit Student Profile Modal
  const handleOpenEditStudent = (user: any) => {
    setProfileEditUser(user);
    setProfileEditName(user.full_name || "");
    setProfileEditGrade(user.grade_level || "");
    setProfileEditEmail(user.email || "");
    setProfileEditDiscount(user.discount_percent || 0);
  };

  // Save Student Profile Changes
  const handleSaveStudentProfile = async () => {
    if (!profileEditUser) return;
    setSavingStudentProfile(true);

    const { error } = await supabase.rpc("update_user_profile_admin", {
      target_user_id: profileEditUser.id,
      new_name: profileEditName.trim(),
      new_grade: profileEditGrade.trim(),
      new_email: profileEditEmail.trim().toLowerCase(),
      new_discount: Number(profileEditDiscount)
    });

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === profileEditUser.id 
          ? { 
              ...p, 
              full_name: profileEditName.trim(), 
              grade_level: profileEditGrade.trim(), 
              email: profileEditEmail.trim().toLowerCase(),
              discount_percent: Number(profileEditDiscount)
            } 
          : p
      ));
      setProfileEditUser(null);
    } else {
      alert(error.message || "Failed to update student profile.");
    }
    setSavingStudentProfile(false);
  };

  // Delete Student Account Handler
  const handleDeleteStudent = async (userId: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete the account for ${name}? This action is irreversible and will delete all user data.`)) return;
    setUpdatingId(userId);

    const { error } = await supabase.rpc("delete_user_direct", {
      target_user_id: userId
    });

    if (!error) {
      setProfiles(profiles.filter(p => p.id !== userId));
    } else {
      alert(error.message || "Failed to delete student account.");
    }
    setUpdatingId(null);
  };

  // Open Edit Promo Code Modal
  const handleOpenEditPromo = (promo: any) => {
    setEditingPromo(promo);
    setEditingPromoCode(promo.code);
    setEditingPromoDiscountType(promo.discount_type);
    setEditingPromoDiscountValue(promo.discount_value);
    setEditingPromoMaxUses(promo.max_uses !== null ? String(promo.max_uses) : "");
    setEditingPromoStartDate(promo.start_date ? new Date(promo.start_date).toISOString().slice(0, 16) : "");
    setEditingPromoEndDate(promo.end_date ? new Date(promo.end_date).toISOString().slice(0, 16) : "");
  };

  // Save Promo Code Changes
  const handleSavePromoCode = async () => {
    if (!editingPromo) return;
    setSavingPromo(true);

    const payload = {
      code: editingPromoCode.trim().toUpperCase(),
      discount_type: editingPromoDiscountType,
      discount_value: Number(editingPromoDiscountValue),
      max_uses: editingPromoMaxUses.trim() ? Number(editingPromoMaxUses) : null,
      start_date: new Date(editingPromoStartDate).toISOString(),
      end_date: new Date(editingPromoEndDate).toISOString()
    };

    const { error } = await supabase
      .from("promocodes")
      .update(payload)
      .eq("id", editingPromo.id);

    if (!error) {
      setPromocodes(promocodes.map(p => 
        p.id === editingPromo.id 
          ? { ...p, ...payload } 
          : p
      ));
      setEditingPromo(null);
    } else {
      alert(error.message || "Failed to update promo code.");
    }
    setSavingPromo(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <p className="text-sm font-semibold text-gray-500">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  // Permission shortcut checks
  const isSuperAdmin = currentUserProfile?.role === "super_admin";
  const adminLocale = ["en", "tr", "es", "zh"].includes(currentUserProfile?.language)
    ? currentUserProfile.language as keyof typeof ADMIN_UI_COPY
    : "en";
  const adminText = ADMIN_UI_COPY[adminLocale];
  const perms = currentUserProfile?.permissions || [];
  const canManageUsers = isSuperAdmin || perms.includes("manage_users");
  const canManagePromocodes = isSuperAdmin || perms.includes("manage_promocodes");
  const canManageSettings = isSuperAdmin || perms.includes("manage_settings");
  const canManageCommunications =
    isSuperAdmin || perms.includes("manage_communications");
  const canViewLogs = isSuperAdmin || perms.includes("view_logs");

  // Metrics
  const totalUsers = profiles.length;
  const handleDeletePost = async (postId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this social forum post?");
    if (!confirm) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (!error) {
      setModerationPosts(prev => prev.filter(p => p.id !== postId));
      alert("Post deleted successfully.");
    } else {
      alert("Failed to delete post: " + error.message);
    }
  };

  const handleTogglePostFlag = async (postId: string, currentFlag: boolean) => {
    const { error } = await supabase
      .from("posts")
      .update({ is_flagged: !currentFlag })
      .eq("id", postId);

    if (!error) {
      setModerationPosts(prev => prev.map(p => p.id === postId ? { ...p, is_flagged: !currentFlag } : p));
    } else {
      alert("Failed to update post status: " + error.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    setCreatingAnn(true);

    const targetFilter = newAnnTargetAudience !== "all" && newAnnTargetFilter.trim()
      ? { [newAnnTargetAudience]: newAnnTargetFilter.trim() }
      : {};

    const { error } = await supabase
      .from("announcements")
      .insert({
        title: newAnnTitle.trim(),
        content: newAnnContent.trim(),
        type: newAnnType,
        display_type: newAnnDisplayType,
        questions: newAnnQuestions.length > 0 ? newAnnQuestions : [],
        target_audience: newAnnTargetAudience,
        target_filter: targetFilter
      });

    if (!error) {
      setNewAnnTitle("");
      setNewAnnContent("");
      setNewAnnQuestions([]);
      setNewAnnTargetAudience("all");
      setNewAnnTargetFilter("");
      fetchAnnouncementsData();
    } else {
      alert("Failed to create announcement: " + error.message);
    }
    setCreatingAnn(false);
  };

  const handleAddQuestion = () => {
    if (!newAnnQuestionText.trim()) return;
    const newQ = {
      id: "q_" + Date.now(),
      question: newAnnQuestionText.trim(),
      type: "text"
    };
    setNewAnnQuestions(prev => [...prev, newQ]);
    setNewAnnQuestionText("");
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    const confirm = window.confirm("Are you sure you want to permanently delete this announcement?");
    if (!confirm) return;
    const { error } = await supabase.from("announcements").delete().eq("id", annId);
    if (!error) setAnnouncements(prev => prev.filter(a => a.id !== annId));
  };

  const handleToggleAnnActive = async (ann: any) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !ann.is_active })
      .eq("id", ann.id);
    if (!error) {
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, is_active: !ann.is_active } : a));
    } else {
      alert("Failed to update status: " + error.message);
    }
  };

  const handleOpenEditAnn = (ann: any) => {
    setEditingAnn(ann);
    setEditAnnTitle(ann.title);
    setEditAnnContent(ann.content);
    setEditAnnType(ann.type);
    setEditAnnDisplayType(ann.display_type);
    setEditAnnTargetAudience(ann.target_audience || "all");
    setEditAnnTargetFilter(ann.target_filter ? Object.values(ann.target_filter)[0] as string : "");
  };

  const handleSaveEditAnn = async () => {
    if (!editingAnn) return;
    setSavingAnn(true);
    const targetFilter = editAnnTargetAudience !== "all" && editAnnTargetFilter.trim()
      ? { [editAnnTargetAudience]: editAnnTargetFilter.trim() }
      : {};
    const { error } = await supabase
      .from("announcements")
      .update({
        title: editAnnTitle.trim(),
        content: editAnnContent.trim(),
        type: editAnnType,
        display_type: editAnnDisplayType,
        target_audience: editAnnTargetAudience,
        target_filter: targetFilter
      })
      .eq("id", editingAnn.id);
    if (!error) {
      setAnnouncements(prev => prev.map(a => a.id === editingAnn.id
        ? { ...a, title: editAnnTitle.trim(), content: editAnnContent.trim(), type: editAnnType, display_type: editAnnDisplayType, target_audience: editAnnTargetAudience, target_filter: targetFilter }
        : a
      ));
      setEditingAnn(null);
    } else {
      alert("Failed to save: " + error.message);
    }
    setSavingAnn(false);
  };

  const handleSendEmailBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailContent.trim()) return;
    setSendingEmail(true);
    setEmailResult(null);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: {
            en: emailSubject,
            tr: emailSubjectTR,
            es: emailSubjectES,
            zh: emailSubjectZH,
          },
          content: {
            en: emailContent,
            tr: emailContentTR,
            es: emailContentES,
            zh: emailContentZH,
          },
          isMandatory: emailIsMandatory,
          sendEmail: emailSendEmail,
          sendInApp: emailSendInApp,
          targetPlan: emailTargetPlan === "all" ? null : emailTargetPlan
        })
      });

      const data = await res.json();
      if (data.success) {
        setEmailResult(
          `Delivered: ${data.sentCount || 0} email(s), ${data.inAppCount || 0} in-app notification(s). ${data.failedCount || 0} failed.`
        );
        setEmailSubject("");
        setEmailContent("");
        setEmailSubjectTR("");
        setEmailContentTR("");
        setEmailSubjectES("");
        setEmailContentES("");
        setEmailSubjectZH("");
        setEmailContentZH("");
      } else {
        setEmailResult("Error sending email: " + (data.error || ""));
      }
    } catch {
      setEmailResult("Network error sending emails.");
    }
    setSendingEmail(false);
  };

  const handleTranslateEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      setEmailResult("AI çevirisi için önce İngilizce konu ve mesajı girin.");
      return;
    }
    setTranslatingEmail(true);
    setEmailResult(null);
    try {
      const response = await fetch("/api/admin/translate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, content: emailContent }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.translations) {
        throw new Error(data.error || "AI çevirisi hazırlanamadı.");
      }
      setEmailSubjectTR(data.translations.tr.subject);
      setEmailContentTR(data.translations.tr.content);
      setEmailSubjectES(data.translations.es.subject);
      setEmailContentES(data.translations.es.content);
      setEmailSubjectZH(data.translations.zh.subject);
      setEmailContentZH(data.translations.zh.content);
      setEmailResult("TR, ES ve ZH çevirileri AI ile hazırlandı. Göndermeden önce düzenleyebilirsiniz.");
    } catch (error) {
      setEmailResult(error instanceof Error ? error.message : "AI çevirisi hazırlanamadı.");
    } finally {
      setTranslatingEmail(false);
    }
  };

  const handleCancelUserSubscription = async (userId: string, userName: string) => {
    const confirm = window.confirm(`Are you sure you want to cancel subscription for ${userName}? Their plan will be set to Free.`);
    if (!confirm) return;

    const note = window.prompt("Optional internal cancellation note:", "") || "";
    const notifyUser = window.confirm("Send an in-app cancellation notification to this user?");
    const { error } = await supabase.rpc("admin_cancel_subscription", {
      target_user_id: userId,
      cancellation_note: note,
      notify_user: notifyUser
    });

    if (!error) {
      alert(`Subscription for ${userName} cancelled successfully.`);
      fetchProfiles();
    } else {
      alert("Failed to cancel subscription: " + error.message);
    }
  };

  const proUsers = profiles.filter(p => {
    const active = p.plan === "pro" && (p.pro_expires_at === null || new Date(p.pro_expires_at) > new Date());
    return active || p.plan === "founding";
  }).length;
  const adminUsers = profiles.filter(p => p.role === "admin" || p.role === "super_admin").length;
  const premiumRatio = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0;

  // Render Sub-Admin welcome screen if they have absolutely no permissions
  const hasAnyPermission =
    canManageUsers ||
    canManagePromocodes ||
    canManageSettings ||
    canManageCommunications ||
    canViewLogs;
  if (!isSuperAdmin && !hasAnyPermission) {
    return (
      <main className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-gray-150 p-8 rounded-3xl max-w-md w-full space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center mx-auto border border-yellow-500/20">
            <Shield size={28} />
          </div>
          <h2 className="text-lg font-bold text-surface-dark">Permission Required</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            You are registered as a **Sub-Admin**. However, the Super Admin has not assigned any specific panel permissions to your profile yet.
          </p>
          <Link href="/dashboard" className="inline-block px-5 py-2.5 bg-brand text-white font-bold rounded-xl text-xs hover:bg-brand-hover transition-all active:scale-95 shadow-sm">
            {adminText.back}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200/60 pb-5">
          <div>
            <div className="flex items-center gap-2 text-brand mb-2">
              <Link href="/dashboard" className="flex items-center gap-1.5 text-xs font-bold hover:underline">
                <ArrowLeft size={14} /> {adminText.back}
              </Link>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
              <UserCog className="text-brand" size={24} /> {adminText.title}
            </h1>
            <p className="text-xs text-gray-500 mt-1">{adminText.subtitle}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-brand/10 text-brand px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-brand/20">
              <Shield size={14} /> {isSuperAdmin ? adminText.superConsole : adminText.subConsole}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-6 overflow-x-auto pb-px">
          {(isSuperAdmin || perms.includes("manage_users")) && (
            <button
              onClick={() => setActiveTab("users")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "users" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              👥 Users & Stats
            </button>
          )}
          {(isSuperAdmin || perms.includes("manage_promocodes")) && (
            <button
              onClick={() => setActiveTab("promocodes")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "promocodes" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              🏷️ Promocodes
            </button>
          )}
          {(isSuperAdmin || perms.includes("manage_settings")) && (
            <button
              onClick={() => setActiveTab("config")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "config" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              ⚙️ System Config
            </button>
          )}
          {(isSuperAdmin || perms.includes("view_logs")) && (
            <button
              onClick={() => setActiveTab("logs")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "logs" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📋 Audit Logs
            </button>
          )}
          <button
            onClick={() => setActiveTab("bugs")}
            className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "bugs" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🐞 Bug Reports & AI Analytics
          </button>
          {isSuperAdmin && (
              <button
                onClick={() => setActiveTab("moderation")}
                className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "moderation" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                🛡️ Social Moderation
              </button>
          )}
          {canManageCommunications && (
              <button
                onClick={() => setActiveTab("announcements")}
                className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "announcements" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                📢 Bulletins & Feedbacks
              </button>
          )}
        </div>

        {/* Stats Cards (Only visible if allowed to manage users) */}
        {activeTab === "users" && canManageUsers && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{adminText.totalStudents}</h3>
              <p className="text-2xl font-bold text-surface-dark mt-2">{totalUsers}</p>
            </div>
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{adminText.proMembers}</h3>
              <p className="text-2xl font-bold text-brand mt-2">{proUsers}</p>
            </div>
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{adminText.proRatio}</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">{premiumRatio}%</p>
            </div>
            <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{adminText.totalAdmins}</h3>
              <p className="text-2xl font-bold text-surface-dark mt-2">{adminUsers}</p>
            </div>
          </div>
        )}

        {/* AI & R2 Configurations Section */}
        {activeTab === "config" && canManageSettings && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-8">
            {systemSettingsError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-semibold text-red-700 flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{systemSettingsError}</span>
              </div>
            )}
            {/* AI Settings Form */}
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                  <Key className="text-brand" size={18} /> AI Provider Configurations
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select your active AI provider and save API credentials.
                </p>
              </div>

              <form onSubmit={handleSaveAiSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active AI Provider</label>
                    <select
                      value={activeProvider}
                      onChange={(e) => setActiveProvider(e.target.value)}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer"
                    >
                      <option value="gemini">Google Gemini (Flash)</option>
                      <option value="openai">OpenAI (GPT-4o Mini)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 text-[10px] pb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${hasGemini ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                      Gemini: {hasGemini ? "Configured" : "Not Set"}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${hasOpenai ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                      OpenAI: {hasOpenai ? "Configured" : "Not Set"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder={hasGemini ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter Gemini API Key (e.g. AIzaSy...)"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">OpenAI API Key</label>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder={hasOpenai ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter OpenAI API Key (e.g. sk-proj...)"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    {saveSuccess && (
                      <p className="text-xs text-green-500 font-semibold flex items-center gap-1 animate-pulse">
                        <CheckCircle2 size={12} /> AI configurations updated successfully!
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={savingKey}
                    className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 self-end shrink-0 shadow-sm"
                  >
                    {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={12} />}
                    {savingKey ? "Saving Settings..." : "Save AI Configurations"}
                  </button>
                </div>
              </form>
            </div>

            {/* Cloudflare R2 Configurations Form */}
            <div className="border-t border-gray-100 pt-8">
              <div>
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                  <Settings className="text-brand" size={18} /> Cloudflare R2 configurations
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure object storage parameters for cheap study attachments.
                </p>
              </div>

              <form onSubmit={handleSaveR2Settings} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">R2 Access Key ID</label>
                    <input
                      type="password"
                      value={r2AccessKey}
                      onChange={(e) => setR2AccessKey(e.target.value)}
                      placeholder={hasR2AccessKey ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter R2 Access Key ID"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">R2 Secret Access Key</label>
                    <input
                      type="password"
                      value={r2SecretKey}
                      onChange={(e) => setR2SecretKey(e.target.value)}
                      placeholder={hasR2SecretKey ? "•••••••••••••••• (Enter new key to overwrite)" : "Enter R2 Secret Access Key"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">R2 S3 endpoint URL</label>
                    <input
                      type="text"
                      value={r2Endpoint}
                      onChange={(e) => setR2Endpoint(e.target.value)}
                      placeholder="https://<account-id>.r2.cloudflarestorage.com"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bucket Name</label>
                    <input
                      type="text"
                      value={r2BucketName}
                      onChange={(e) => setR2BucketName(e.target.value)}
                      placeholder="e.g. onpace-notes"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">R2 Public URL / Subdomain</label>
                  <input
                    type="text"
                    value={r2PublicUrl}
                    onChange={(e) => setR2PublicUrl(e.target.value)}
                    placeholder="https://pub-xxxxxx.r2.dev or custom domain"
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${hasR2AccessKey && hasR2SecretKey ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                      R2 Credentials: {hasR2AccessKey && hasR2SecretKey ? "Configured" : "Not Set"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {saveR2Success && (
                      <span className="text-green-500 text-xs font-semibold flex items-center gap-1 animate-pulse">
                        <CheckCircle2 size={12} /> Settings saved successfully!
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={savingR2}
                      className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {savingR2 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={12} />}
                      Save R2 Settings
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Payment Gateway, Maintenance Mode & Resend Settings Form */}
            <div className="border-t border-gray-100 pt-8 space-y-6">
              <div>
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                  <CreditCard className="text-brand" size={18} /> Payment Gateway, Maintenance & Resend Settings
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Control payment acceptance, set custom plan prices, toggle maintenance mode, and configure Resend API Key.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveSystemSettings(); }} className="space-y-6">
                {/* Payment Gateway Toggle & Maintenance Mode Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-surface-dark">💳 Accept Real Payments</p>
                      <p className="text-[10px] text-gray-500">Enable online checkout for plan upgrades</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={paymentGatewayEnabled}
                      onChange={(e) => setPaymentGatewayEnabled(e.target.checked)}
                      disabled={!paymentProviderConfigured && !paymentGatewayEnabled}
                      title={
                        paymentProviderConfigured
                          ? "Ödeme kabulünü aç veya kapat"
                          : "Önce gerçek bir ödeme sağlayıcısı yapılandırılmalıdır"
                      }
                      className="h-5 w-5 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer accent-brand disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-surface-dark">🚨 System Maintenance Mode</p>
                      <p className="text-[10px] text-gray-500">Redirect non-admin users to maintenance screen</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={maintenanceMode}
                      onChange={(e) => void handleMaintenanceModeChange(e.target.checked)}
                      disabled={savingSystemSettings}
                      className="h-5 w-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-surface-dark">Maintenance Page Content</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Edit the maintenance message in all four languages. “Coming soon” items are optional; leave the list empty to hide that section.
                      </p>
                    </div>
                    <a
                      href="/maintenance?preview=1"
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-50"
                    >
                      Preview maintenance page ↗
                    </a>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {([
                      ["en", "English"],
                      ["tr", "Türkçe"],
                      ["es", "Español"],
                      ["zh", "中文"],
                    ] as Array<[MaintenanceLanguage, string]>).map(([language, label]) => {
                      const localized = maintenanceContent[language];
                      const updateField = (
                        field: keyof Omit<typeof localized, "coming_items">,
                        value: string
                      ) => {
                        setMaintenanceContent((current) => ({
                          ...current,
                          [language]: {
                            ...current[language],
                            [field]: value,
                          },
                        }));
                      };
                      return (
                        <div key={language} className="rounded-2xl border border-gray-150 bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-extrabold text-surface-dark">{label}</p>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase text-gray-500">
                              {language}
                            </span>
                          </div>
                          <input
                            value={localized.badge}
                            onChange={(event) => updateField("badge", event.target.value)}
                            placeholder="Status badge (optional)"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-surface-dark outline-none focus:border-amber-400"
                          />
                          <input
                            value={localized.title}
                            onChange={(event) => updateField("title", event.target.value)}
                            placeholder="Page title"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-surface-dark outline-none focus:border-amber-400"
                          />
                          <textarea
                            rows={3}
                            value={localized.description}
                            onChange={(event) => updateField("description", event.target.value)}
                            placeholder="Maintenance explanation"
                            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-surface-dark outline-none focus:border-amber-400"
                          />
                          <input
                            value={localized.coming_title}
                            onChange={(event) => updateField("coming_title", event.target.value)}
                            placeholder="Coming soon heading (optional)"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-surface-dark outline-none focus:border-amber-400"
                          />
                          <textarea
                            rows={4}
                            value={localized.coming_items.join("\n")}
                            onChange={(event) =>
                              setMaintenanceContent((current) => ({
                                ...current,
                                [language]: {
                                  ...current[language],
                                  coming_items: event.target.value
                                    .split("\n")
                                    .map((item) => item.trim())
                                    .filter(Boolean),
                                },
                              }))
                            }
                            placeholder={"Optional upcoming features\nOne item per line"}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-surface-dark outline-none focus:border-amber-400"
                          />
                          <input
                            value={localized.back_soon}
                            onChange={(event) => updateField("back_soon", event.target.value)}
                            placeholder="Closing message (optional)"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-surface-dark outline-none focus:border-amber-400"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold text-surface-dark">Public Legal Pages</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Edit the public Privacy Policy and Terms of Service used for Google OAuth verification.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/privacy?lang=${legalEditorLanguage}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"
                      >
                        Preview privacy ↗
                      </a>
                      <a
                        href={`/terms?lang=${legalEditorLanguage}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"
                      >
                        Preview terms ↗
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["privacy", "terms"] as LegalDocumentType[]).map((documentType) => (
                      <button
                        key={documentType}
                        type="button"
                        onClick={() => setLegalEditorDocument(documentType)}
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold ${
                          legalEditorDocument === documentType
                            ? "bg-indigo-600 text-white"
                            : "border border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {documentType === "privacy" ? "Privacy Policy" : "Terms of Service"}
                      </button>
                    ))}
                    <span className="mx-1 h-8 w-px bg-gray-200" />
                    {(["en", "tr", "es", "zh"] as LegalLanguage[]).map((language) => (
                      <button
                        key={language}
                        type="button"
                        onClick={() => setLegalEditorLanguage(language)}
                        className={`rounded-xl px-3 py-2 text-[11px] font-bold uppercase ${
                          legalEditorLanguage === language
                            ? "bg-brand text-white"
                            : "border border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {language}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <input
                      value={legalDocuments[legalEditorDocument][legalEditorLanguage].title}
                      onChange={(event) => updateLegalDocumentField("title", event.target.value)}
                      placeholder="Document title"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-surface-dark outline-none focus:border-indigo-400"
                    />
                    <input
                      value={legalDocuments[legalEditorDocument][legalEditorLanguage].last_updated}
                      onChange={(event) => updateLegalDocumentField("last_updated", event.target.value)}
                      placeholder="Last updated"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-surface-dark outline-none focus:border-indigo-400"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={legalDocuments[legalEditorDocument][legalEditorLanguage].summary}
                    onChange={(event) => updateLegalDocumentField("summary", event.target.value)}
                    placeholder="Short public summary"
                    className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-surface-dark outline-none focus:border-indigo-400"
                  />
                  <textarea
                    rows={18}
                    value={legalDocuments[legalEditorDocument][legalEditorLanguage].content}
                    onChange={(event) => updateLegalDocumentField("content", event.target.value)}
                    placeholder={"## Section heading\nSection content"}
                    className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-3 font-mono text-[11px] leading-5 text-surface-dark outline-none focus:border-indigo-400"
                  />
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Public contact email
                    </label>
                    <input
                      type="email"
                      value={legalDocuments[legalEditorDocument][legalEditorLanguage].contact_email}
                      onChange={(event) => updateLegalDocumentField("contact_email", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-surface-dark outline-none focus:border-indigo-400"
                    />
                  </div>
                  <p className="text-[10px] leading-relaxed text-gray-500">
                    Use <code className="rounded bg-white px-1 py-0.5">## Heading</code> on a separate line to create a new section. Legal changes are published after saving this form.
                  </p>
                </div>

                {!paymentProviderConfigured && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
                    <p className="font-bold">Gerçek ödeme sağlayıcısı henüz yapılandırılmadı.</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                      Ödeme kabulü güvenlik amacıyla kapalı tutuluyor. Sağlayıcı adaptörü ve imzalı webhook
                      tamamlandıktan sonra bu anahtar kullanılabilir. Mevcut sağlayıcı: {paymentProvider}.
                    </p>
                  </div>
                )}

                {/* Plan Pricing Editors */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Dynamic Plan Pricing (USD)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Pro Monthly Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={proMonthlyPrice}
                        onChange={(e) => setProMonthlyPrice(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Pro Yearly Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={proYearlyPrice}
                        onChange={(e) => setProYearlyPrice(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none font-bold text-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 font-semibold">Founding Plan Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={foundingPrice}
                        onChange={(e) => setFoundingPrice(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Disabled Custom Notice Message */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Custom Notice when Payment Gateway is OFF
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold">Türkçe Mesaj (TR):</span>
                      <textarea
                        rows={2}
                        value={disabledMsgTR}
                        onChange={(e) => setDisabledMsgTR(e.target.value)}
                        placeholder="Plan değişikliği yalnızca size verilen promocode üzerinden veya sistem yöneticiniz tarafından yapılabilir."
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none resize-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold">English Message (EN):</span>
                      <textarea
                        rows={2}
                        value={disabledMsgEN}
                        onChange={(e) => setDisabledMsgEN(e.target.value)}
                        placeholder="Plan changes can only be made using a promo code issued to you or by your system administrator."
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none resize-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold">Mensaje en español (ES):</span>
                      <textarea
                        rows={2}
                        value={disabledMsgES}
                        onChange={(e) => setDisabledMsgES(e.target.value)}
                        placeholder="Los cambios de plan están temporalmente deshabilitados."
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none resize-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold">中文消息 (ZH):</span>
                      <textarea
                        rows={2}
                        value={disabledMsgZH}
                        onChange={(e) => setDisabledMsgZH(e.target.value)}
                        placeholder="套餐变更目前暂不可用。"
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Resend API Key */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Resend Email Configuration
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasResend ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                      {hasResend ? "Vault configured" : "Not configured"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder={hasResend ? "Enter a new key only to rotate it" : "re_123456789..."}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none"
                    />
                    <input
                      type="email"
                      value={emailFromAddress}
                      readOnly
                      aria-label="Announcement sender address"
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 text-surface-dark outline-none"
                    />
                    <input
                      type="email"
                      value="security@onpace-ai.xyz"
                      readOnly
                      aria-label="Security sender address"
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 text-surface-dark outline-none"
                    />
                    <input
                      type="text"
                      value={emailFromName}
                      onChange={(e) => setEmailFromName(e.target.value)}
                      placeholder="OnPace"
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none sm:col-span-2"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Announcements are sent from no-reply@onpace-ai.xyz. Account
                    and security messages are sent from security@onpace-ai.xyz.
                    The API key is stored in Supabase Vault and is never returned
                    to the browser.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {saveSystemSettingsSuccess && (
                      <span className="text-green-500 text-xs font-semibold flex items-center gap-1 animate-pulse">
                        <CheckCircle2 size={12} /> System settings & Resend API Key saved successfully!
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={savingSystemSettings}
                    className="px-5 py-2.5 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {savingSystemSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={12} />}
                    {savingSystemSettings ? "Saving..." : "Save Payment & System Settings"}
                  </button>
                </div>
              </form>
            </div>

            {/* Billing Retry & Grace Settings Form */}
            <div className="border-t border-gray-100 pt-8">
              <div>
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                  <CreditCard className="text-brand" size={18} /> Global Billing Rules & Grace Periods
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Configure global rules for handling rejected payments, retry counts, and cancellation grace periods.
                </p>
              </div>

              <form onSubmit={handleSaveBillingRules} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Consecutive Failed Retries before Cancellation</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={maxFailedAttempts}
                      onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
                      placeholder="e.g. 3"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Global Grace Period Days</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={30}
                      value={globalGraceDays}
                      onChange={(e) => setGlobalGraceDays(Number(e.target.value))}
                      placeholder="e.g. 3"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand transition-all text-surface-dark bg-white font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    {saveBillingRulesSuccess && (
                      <span className="text-green-500 text-xs font-semibold flex items-center gap-1 animate-pulse">
                        <CheckCircle2 size={12} /> Billing rules updated successfully!
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={savingBillingRules}
                    className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {savingBillingRules ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={12} />}
                    Save Billing Rules
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Promo Codes Management Panel */}
        {activeTab === "promocodes" && canManagePromocodes && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                <Tag className="text-brand" size={18} /> Promo Codes Management
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Create campaigns, set maximum utilization caps, discount values, and validity schedules.
              </p>
            </div>

            {/* Create Promocode Form */}
            <form onSubmit={handleCreatePromocode} className="bg-gray-50/50 p-4 border border-gray-200/60 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-surface-dark flex items-center gap-1"><PlusCircle size={14} className="text-brand" /> Create New Promo Code</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Promo Code (Uppercase)</label>
                  <input
                    type="text"
                    required
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                    placeholder="e.g. DISCOUNT50, TRIAL30"
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="free_trial">Free Pro Trial (Days)</option>
                    <option value="lifetime">Lifetime Free Pro Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount / Trial Value</label>
                  <input
                    type="number"
                    required
                    disabled={discountType === "lifetime"}
                    value={discountType === "lifetime" ? 0 : discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    min={0}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Uses Count (Empty = Unlimited)</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Date (Expiration)</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>
                  {promoSuccess && (
                    <p className="text-xs text-green-500 font-semibold flex items-center gap-1 animate-pulse">
                      <CheckCircle2 size={12} /> Promo code successfully created!
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={creatingPromo}
                  className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  {creatingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag size={12} />}
                  Create Promo Code
                </button>
              </div>
            </form>

            {/* List Promocodes */}
            <div className="overflow-x-auto border border-gray-150 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Discount Details</th>
                    <th className="px-5 py-3">Usage</th>
                    <th className="px-5 py-3">Valid Dates</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs text-gray-700 bg-white">
                  {promocodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-gray-400">No active promo codes campaigns registered.</td>
                    </tr>
                  ) : (
                    promocodes.map((promo) => {
                      const now = new Date();
                      const start = new Date(promo.start_date);
                      const end = new Date(promo.end_date);
                      const isExpired = now > end || now < start;
                      const limitReached = promo.max_uses !== null && promo.uses_count >= promo.max_uses;

                      return (
                        <tr key={promo.id} className="hover:bg-gray-50/40">
                          <td className="px-5 py-3 font-bold text-surface-dark">{promo.code}</td>
                          <td className="px-5 py-3">
                            <span className="font-semibold text-xs">
                              {promo.discount_type === "lifetime" ? "Lifetime Pro Access" :
                               promo.discount_type === "free_trial" ? `${promo.discount_value} Days Free Pro Trial` :
                               `${promo.discount_value}% Discount Percentage`}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium">
                            {promo.uses_count} / {promo.max_uses !== null ? promo.max_uses : "∞"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {start.toLocaleDateString()} to {end.toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold">Expired</span>
                            ) : limitReached ? (
                              <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold">Limit Reached</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-green-50 border border-green-100 text-green-600 text-[10px] font-bold">Active</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                             <div className="flex justify-end gap-2.5">
                               <button
                                 onClick={() => handleOpenEditPromo(promo)}
                                 className="p-1 hover:text-brand text-gray-400 transition-colors cursor-pointer"
                                 title="Edit Promo Code"
                               >
                                 <Edit size={14} />
                               </button>
                               <button
                                 onClick={() => handleDeletePromocode(promo.id)}
                                 className="p-1 hover:text-red-500 text-gray-400 transition-colors cursor-pointer"
                                 title="Delete Promo Code"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Table */}
        {activeTab === "users" && canManageUsers && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-surface-dark">Registered Students</h2>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-brand" />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-100">
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Grade Level</th>
                    <th className="px-6 py-4">Subscription Plan</th>
                    <th className="px-6 py-4">Expiration / Status</th>
                    <th className="px-6 py-4">Admin Role</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        No users registered in the database yet.
                      </td>
                    </tr>
                  )}
                  {profiles.map((profile) => {
                    const isUserPro = profile.plan === "pro";
                    const isExpired = profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date();
                    const isTrial = profile.trial_ends_at !== null;
                    
                    return (
                      <tr key={profile.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-surface-dark">
                            {profile.full_name || "Anonymous User"}
                          </div>
                          {profile.email && (
                            <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                              {profile.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {profile.grade_level || "Not specified"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isUserPro && !isExpired ? "bg-brand/10 text-brand" : "bg-gray-100 text-gray-600"}`}>
                            {isUserPro && !isExpired ? (
                              <>
                                <Sparkles size={12} /> Pro Tier
                              </>
                            ) : profile.plan === "founding" ? (
                              <>
                                <Sparkles size={12} className="text-purple-500 animate-pulse" /> Founding
                              </>
                            ) : (
                              "Free Tier"
                            )}
                          </span>
                          {profile.discount_percent > 0 && (
                            <span className="ml-2 text-[10px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-200">
                              -{profile.discount_percent}% Coupon
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {isUserPro && !isExpired ? (
                            profile.billing_cycle === "monthly" ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Clock size={11} className="text-brand" /> Monthly Plan</span>
                                {profile.next_billing_date && <span className="block text-[10px] text-gray-400">Renews: {new Date(profile.next_billing_date).toLocaleDateString()}</span>}
                              </div>
                            ) : profile.billing_cycle === "yearly" ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Clock size={11} className="text-brand" /> Yearly Plan</span>
                                {profile.next_billing_date && <span className="block text-[10px] text-gray-400">Renews: {new Date(profile.next_billing_date).toLocaleDateString()}</span>}
                              </div>
                            ) : profile.billing_cycle === "lifetime" || !profile.trial_ends_at ? (
                              <span className="font-semibold text-purple-650">Lifetime Access</span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-brand font-semibold">Pro Trial</span>
                                <span className="block text-[10px] text-gray-400">Expires: {new Date(profile.trial_ends_at).toLocaleDateString()}</span>
                              </div>
                            )
                          ) : profile.plan === "founding" ? (
                            <span className="font-semibold text-purple-650">Lifetime Access</span>
                          ) : isExpired ? (
                            <span className="text-red-500 font-bold">Trial Expired</span>
                          ) : (
                            "Free Active"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                            profile.role === "super_admin" 
                              ? "bg-purple-50 text-purple-600 border-purple-100" 
                              : profile.role === "admin" 
                              ? "bg-red-50 text-red-600 border-red-100" 
                              : "bg-gray-100 text-gray-500 border-transparent"
                          }`}>
                            {profile.role === "super_admin" ? "Super Admin" : profile.role === "admin" ? "Sub-Admin" : "Student"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenAdjustAccess(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <CreditCard size={12} /> Set Plan
                            </button>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenBillingDetails(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Clock size={12} /> History
                            </button>
                            {profile.plan !== "free" && (
                              <button
                                disabled={updatingId !== null}
                                onClick={() => handleCancelUserSubscription(profile.id, profile.full_name || profile.email || "User")}
                                className="px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Cancel subscription and set plan to Free"
                              >
                                <X size={12} /> Cancel Sub
                              </button>
                            )}
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenEditStudent(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Edit size={12} /> Edit Profile
                            </button>
                            {isSuperAdmin && (
                              <button
                                disabled={updatingId !== null}
                                onClick={() => handleOpenEditUser(profile)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <UserCog size={12} /> Edit Role
                              </button>
                            )}
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleDeleteStudent(profile.id, profile.full_name)}
                              className="px-2.5 py-1.5 rounded-lg border border-red-100 text-xs font-bold text-red-600 bg-red-50/30 hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Error & Execution Logs */}
        {activeTab === "logs" && canViewLogs && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                <Terminal className="text-brand" size={18} /> System Execution Logs
              </h2>
              <button
                onClick={fetchLogs}
                className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-brand transition-colors cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-semibold"
              >
                <RefreshCw size={14} /> Refresh Logs
              </button>
            </div>

            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No system errors logged. Everything is running healthy.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border border-red-100 bg-red-50/20 rounded-2xl flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-red-700">
                      <span className="flex items-center gap-1">
                        <AlertTriangle size={14} /> {log.error_message}
                      </span>
                      <span className="text-[10px] font-normal text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-500 mt-1 font-mono bg-white/60 p-2.5 rounded-lg border border-gray-100 break-words overflow-x-auto whitespace-pre-wrap max-h-32">
                      {log.details || "No supplementary trace details provided."}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Triggered by: {log.profiles?.full_name || "Anonymous User / Server Context"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Social Moderation Tab */}
        {activeTab === "moderation" && isSuperAdmin && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    🛡️ Social Feed Moderation
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Review, flag, or remove user posts from the social academy stream.</p>
                </div>
                <button
                  onClick={fetchModerationPosts}
                  className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-brand transition-colors cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-semibold"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {loadingPosts ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-brand" />
                </div>
              ) : moderationPosts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  No posts in the social feed yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {moderationPosts.map((post) => (
                    <div
                      key={post.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-start gap-4 transition-all ${
                        post.is_flagged
                          ? "bg-red-50/30 border-red-100"
                          : "bg-white border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-brand/10 text-brand font-bold text-[10px] flex items-center justify-center border border-brand/20 uppercase shrink-0">
                            {post.profiles?.full_name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-surface-dark">{post.profiles?.full_name || "Anonymous"}</p>
                            <p className="text-[10px] text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
                          </div>
                          {post.is_flagged && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase">
                              🚩 Flagged
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed pl-9">{post.content}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleTogglePostFlag(post.id, post.is_flagged)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                            post.is_flagged
                              ? "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                              : "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          {post.is_flagged ? "✅ Unflag" : "🚩 Flag"}
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer active:scale-95"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bulletins & Feedbacks Tab */}
        {activeTab === "announcements" && canManageCommunications && (
          <div className="space-y-6">

            {/* Create New Announcement Form */}
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">📢 Create Bulletin or Feedback Form</h2>
                <p className="text-xs text-gray-400 mt-0.5">Pinned announcements appear as a banner at the top of the dashboard. Popup forms are shown once per login session.</p>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                    <select value={newAnnType} onChange={(e) => setNewAnnType(e.target.value as "announcement" | "feedback")} className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer font-semibold">
                      <option value="announcement">📢 Announcement (Info only)</option>
                      <option value="feedback">📋 Feedback / Survey Form</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Display Style</label>
                    <select value={newAnnDisplayType} onChange={(e) => setNewAnnDisplayType(e.target.value as "pin" | "popup")} className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer font-semibold">
                      <option value="pin">📌 Pinned Banner (top of dashboard)</option>
                      <option value="popup">🪟 Popup Modal (one-time on login)</option>
                    </select>
                  </div>
                </div>

                {/* Target Audience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50/40 border border-blue-100 rounded-2xl">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">🎯 Target Audience</label>
                    <select value={newAnnTargetAudience} onChange={(e) => { setNewAnnTargetAudience(e.target.value); setNewAnnTargetFilter(""); }} className="block w-full mt-2 px-3 py-2.5 border border-blue-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer font-semibold">
                      <option value="all">👥 All Users</option>
                      <option value="plan">💎 By Subscription Plan</option>
                      <option value="grade">🏫 By Grade Level</option>
                      <option value="course">📚 By Course Name</option>
                    </select>
                  </div>
                  {newAnnTargetAudience !== "all" && (
                    <div>
                      <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {newAnnTargetAudience === "plan" ? "Plan Name (free / plus / pro / founding)" : newAnnTargetAudience === "grade" ? "Grade Level (e.g. 10, 11)" : "Course Name (e.g. Mathematics)"}
                      </label>
                      <input type="text" value={newAnnTargetFilter} onChange={(e) => setNewAnnTargetFilter(e.target.value)} placeholder={newAnnTargetAudience === "plan" ? "pro" : newAnnTargetAudience === "grade" ? "10" : "Mathematics"} className="block w-full mt-2 px-3 py-2.5 border border-blue-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-400 text-gray-900 bg-white" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Title</label>
                  <input type="text" required value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} placeholder="e.g. Scheduled maintenance on July 30th" className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-gray-900 bg-white" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Content / Body</label>
                  <textarea required rows={3} value={newAnnContent} onChange={(e) => setNewAnnContent(e.target.value)} placeholder="Write the full announcement text here..." className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-gray-900 bg-white resize-none" />
                </div>

                {newAnnType === "feedback" && (
                  <div className="space-y-3 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                    <label className="block text-[10px] font-bold text-purple-600 uppercase tracking-wider">Survey Questions</label>
                    {newAnnQuestions.length > 0 && (
                      <div className="space-y-1.5">
                        {newAnnQuestions.map((q: any, idx: number) => (
                          <div key={q.id} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-2.5 rounded-xl border border-purple-100">
                            <span className="font-bold text-purple-600 shrink-0">Q{idx + 1}.</span>
                            <span className="flex-1">{q.question}</span>
                            <button type="button" onClick={() => setNewAnnQuestions((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))} className="text-red-400 hover:text-red-600 cursor-pointer shrink-0"><Trash2 size={13} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input type="text" value={newAnnQuestionText} onChange={(e) => setNewAnnQuestionText(e.target.value)} placeholder="Type a question and click Add..." className="flex-1 px-3 py-2 border border-purple-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-purple-400 bg-white text-gray-900 placeholder-gray-400" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddQuestion(); } }} />
                      <button type="button" onClick={handleAddQuestion} className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 cursor-pointer active:scale-95 transition-all">+ Add</button>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={creatingAnn} className="w-full py-3 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                  {creatingAnn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle size={14} />}
                  {creatingAnn ? "Publishing..." : "Publish Announcement"}
                </button>
              </form>
            </div>

            {/* Resend Email Broadcast Tool */}
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                  📧 Resend Email Broadcast Tool
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Send targeted emails for announcements, promo codes, feature updates, or mandatory system notices.
                </p>
              </div>

              <form onSubmit={handleSendEmailBroadcast} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Recipient plan</label>
                  <select
                    value={emailTargetPlan}
                    onChange={(event) => setEmailTargetPlan(event.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none"
                  >
                    <option value="all">All plans</option>
                    <option value="free">Free</option>
                    <option value="plus">Plus</option>
                    <option value="pro">Pro</option>
                    <option value="founding">Founding</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { code: "EN", subject: emailSubject, setSubject: setEmailSubject, content: emailContent, setContent: setEmailContent, required: true },
                    { code: "TR", subject: emailSubjectTR, setSubject: setEmailSubjectTR, content: emailContentTR, setContent: setEmailContentTR, required: false },
                    { code: "ES", subject: emailSubjectES, setSubject: setEmailSubjectES, content: emailContentES, setContent: setEmailContentES, required: false },
                    { code: "ZH", subject: emailSubjectZH, setSubject: setEmailSubjectZH, content: emailContentZH, setContent: setEmailContentZH, required: false },
                  ].map((localizedEmail) => (
                    <div key={localizedEmail.code} className="rounded-xl border border-gray-150 bg-gray-50/40 p-3 space-y-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {localizedEmail.code} subject & body
                      </label>
                      <input
                        type="text"
                        required={localizedEmail.required}
                        value={localizedEmail.subject}
                        onChange={(event) => localizedEmail.setSubject(event.target.value)}
                        placeholder={`${localizedEmail.code} subject${localizedEmail.required ? " (fallback)" : ""}`}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                      />
                      <textarea
                        required={localizedEmail.required}
                        rows={3}
                        value={localizedEmail.content}
                        onChange={(event) => localizedEmail.setContent(event.target.value)}
                        placeholder={`${localizedEmail.code} message body${localizedEmail.required ? " (fallback)" : ""}`}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white resize-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                  <button
                    type="button"
                    onClick={handleTranslateEmail}
                    disabled={translatingEmail || !emailSubject.trim() || !emailContent.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {translatingEmail ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {translatingEmail ? "AI çeviriyor..." : "AI ile TR / ES / ZH çevir"}
                  </button>
                  <p className="text-[11px] text-violet-700">İngilizce metni temel alır; bağlantıları, kodları ve değişkenleri korur.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emailChannelToggle"
                      checked={emailSendEmail}
                      onChange={(e) => setEmailSendEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-brand"
                    />
                    <label htmlFor="emailChannelToggle" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Send by email
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="inAppChannelToggle"
                      checked={emailSendInApp}
                      onChange={(e) => setEmailSendInApp(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-brand"
                    />
                    <label htmlFor="inAppChannelToggle" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Add dashboard notification
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emailMandatoryToggle"
                      checked={emailIsMandatory}
                      onChange={(e) => setEmailIsMandatory(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer accent-brand"
                    />
                    <label htmlFor="emailMandatoryToggle" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Mandatory Email (Security/System notice)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emailOptedInToggle"
                      checked={!emailIsMandatory}
                      readOnly
                      disabled
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand accent-brand"
                    />
                    <label htmlFor="emailOptedInToggle" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Consent is enforced for every non-mandatory email
                    </label>
                  </div>
                </div>

                {emailResult && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${emailResult.includes("Error") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                    {emailResult}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sendingEmail || (!emailSendEmail && !emailSendInApp)}
                  className="w-full py-3 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "🚀 Dispatch Email Broadcast"}
                </button>
              </form>
            </div>

            {/* Published Bulletins List */}
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-surface-dark">📋 Published Bulletins</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{announcements.length} bulletin{announcements.length !== 1 ? "s" : ""} total • {announcements.filter(a => a.is_active).length} active</p>
                </div>
                <button onClick={fetchAnnouncementsData} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-brand transition-colors cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-semibold">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {announcements.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No announcements published yet. Create one above.</div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => {
                    const responses = annResponses.filter(r => r.announcement_id === ann.id);
                    const audienceLabel = !ann.target_audience || ann.target_audience === "all"
                      ? "All Users"
                      : ann.target_audience === "plan" ? `Plan: ${Object.values(ann.target_filter || {})[0] || "?"}`
                      : ann.target_audience === "grade" ? `Grade: ${Object.values(ann.target_filter || {})[0] || "?"}`
                      : `Course: ${Object.values(ann.target_filter || {})[0] || "?"}`;
                    return (
                      <div key={ann.id} className={`p-4 border rounded-2xl transition-all space-y-3 ${ ann.is_active ? "border-gray-100 hover:border-gray-200 bg-white" : "border-gray-100 bg-gray-50/50 opacity-70" }`}>
                        {/* Header row */}
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${ ann.type === "feedback" ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-brand/10 text-brand border-brand/20" }`}>
                                {ann.type === "feedback" ? "📋 Survey" : "📢 Bulletin"}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${ ann.display_type === "popup" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-green-50 text-green-600 border-green-100" }`}>
                                {ann.display_type === "popup" ? "🪟 Popup" : "📌 Pinned"}
                              </span>
                              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-100">
                                🎯 {audienceLabel}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${ ann.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-100 text-gray-400 border-gray-200" }`}>
                                {ann.is_active ? "● Active" : "○ Paused"}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-surface-dark">{ann.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{ann.content}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(ann.created_at).toLocaleString("tr-TR")} •
                              {ann.type === "feedback" ? ` ${responses.length} response${responses.length !== 1 ? "s" : ""}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-50">
                          <button onClick={() => setDetailAnn({ ann, responses })} className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 cursor-pointer active:scale-95 transition-all flex items-center gap-1">
                            <Eye size={11} /> View Details
                          </button>
                          <button onClick={() => handleOpenEditAnn(ann)} className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-brand/5 text-brand border border-brand/20 hover:bg-brand/10 cursor-pointer active:scale-95 transition-all flex items-center gap-1">
                            <Edit size={11} /> Edit
                          </button>
                          <button onClick={() => handleToggleAnnActive(ann)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer active:scale-95 transition-all flex items-center gap-1 ${ ann.is_active ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" }`}>
                            {ann.is_active ? (<><span>⏸</span> Pause</>) : (<><span>▶</span> Resume</>)}
                          </button>
                          <button onClick={() => handleDeleteAnnouncement(ann.id)} className="ml-auto px-3 py-1.5 rounded-xl text-[10px] font-bold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 cursor-pointer active:scale-95 transition-all flex items-center gap-1">
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bug Reports & AI Analytics Tab */}
        {activeTab === "bugs" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-150 p-6 rounded-3xl shadow-xs">
              <div>
                <h2 className="text-base font-extrabold text-surface-dark flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={20} /> 🐞 Bug Reports & AI Categorization
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  User bug reports captured with auto-screenshots and classified by AI into 4-digit category codes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={bugFilterCode}
                  onChange={(e) => setBugFilterCode(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark font-semibold outline-none cursor-pointer"
                >
                  <option value="all">All AI Categories</option>
                  <option value="5693">#5693 - Language & Translation</option>
                  <option value="1204">#1204 - UI Layout & Styling</option>
                  <option value="3301">#3301 - AI Assistant & Chat</option>
                  <option value="4002">#4002 - Billing & Payments</option>
                  <option value="2000">#2000 - Functional Features</option>
                  <option value="9000">#9000 - General System Errors</option>
                </select>
                <button
                  onClick={fetchBugReports}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
            </div>

            {loadingBugs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
              </div>
            ) : bugReports.length === 0 ? (
              <div className="bg-white border border-gray-150 rounded-3xl p-12 text-center text-gray-400 text-xs font-medium">
                No bug reports submitted yet. Users can report bugs using the red 🚨 icon in the sidebar.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {bugReports
                  .filter((b) => bugFilterCode === "all" || b.ai_category_code === bugFilterCode)
                  .map((bug) => (
                    <div
                      key={bug.id}
                      className="bg-white border border-gray-150 p-5 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-extrabold flex items-center gap-1">
                            <Tag size={12} /> #{bug.ai_category_code || "9000"} - {bug.ai_category_name || "General Issue"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              bug.status === "resolved"
                                ? "bg-green-50 text-green-600 border border-green-200"
                                : bug.status === "in_progress"
                                ? "bg-amber-50 text-amber-600 border border-amber-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            {bug.status || "open"}
                          </span>
                        </div>

                        <p className="text-xs text-surface-dark font-medium leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
                          "{bug.description}"
                        </p>

                        {bug.screenshot_url && (
                          <div className="relative group cursor-pointer" onClick={() => setSelectedBugScreenshot(bug.screenshot_url)}>
                            <img
                              src={bug.screenshot_url}
                              alt="Bug screenshot"
                              className="w-full h-32 object-cover rounded-2xl border border-gray-200"
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-all">
                              Click to Enlarge 🔍
                            </div>
                          </div>
                        )}
                        {!bug.screenshot_url && bug.screenshot_status === "upload_failed" && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                            <p className="font-bold">Ekran görüntüsü R2&apos;ye yüklenemedi</p>
                            <p className="mt-0.5 break-words">{bug.screenshot_error || "R2 yapılandırmasını ve erişim bilgilerini kontrol edin."}</p>
                          </div>
                        )}
                        {!bug.screenshot_url && bug.screenshot_status !== "upload_failed" && (
                          <p className="text-[11px] text-gray-400">Bu bildirim için ekran görüntüsü yok.</p>
                        )}

                        <div className="text-[10px] text-gray-400 space-y-0.5">
                          <p>User: <span className="font-bold text-gray-700">{bug.user_email || bug.user_id}</span></p>
                          <p className="truncate">URL: <span className="font-mono text-gray-600">{bug.page_url}</span></p>
                          <p>Submitted: {new Date(bug.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Status:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateBugStatus(bug.id, "open")}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${bug.status === "open" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleUpdateBugStatus(bug.id, "in_progress")}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${bug.status === "in_progress" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => handleUpdateBugStatus(bug.id, "resolved")}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${bug.status === "resolved" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                          >
                            Resolved
                          </button>
                          <button
                            onClick={() => handleDeleteBugReport(bug.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hata bildirimini sil"
                            aria-label="Hata bildirimini sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Screenshot View Modal */}
        {selectedBugScreenshot && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedBugScreenshot(null)}>
            <div className="max-w-4xl w-full bg-white rounded-3xl p-4 space-y-3 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h4 className="text-xs font-bold text-surface-dark">Captured Bug Screenshot</h4>
                <button onClick={() => setSelectedBugScreenshot(null)} className="text-gray-400 hover:text-surface-dark font-bold text-sm">
                  &times; Close
                </button>
              </div>
              <img src={selectedBugScreenshot} alt="Full Screenshot" className="w-full max-h-[75vh] object-contain rounded-2xl border border-gray-150" />
            </div>
          </div>
        )}

        {/* Modal: Edit Announcement */}
        {editingAnn && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-brand to-brand-dark p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">✏️ Edit Announcement</h3>
                  <p className="text-xs opacity-75 mt-0.5">{editingAnn.title}</p>
                </div>
                <button onClick={() => setEditingAnn(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                    <select value={editAnnType} onChange={(e) => setEditAnnType(e.target.value as "announcement" | "feedback")} className="block w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer">
                      <option value="announcement">📢 Announcement</option>
                      <option value="feedback">📋 Feedback Survey</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Display</label>
                    <select value={editAnnDisplayType} onChange={(e) => setEditAnnDisplayType(e.target.value as "pin" | "popup")} className="block w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer">
                      <option value="pin">📌 Pinned Banner</option>
                      <option value="popup">🪟 Popup Modal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/40 border border-blue-100 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">Target Audience</label>
                    <select value={editAnnTargetAudience} onChange={(e) => { setEditAnnTargetAudience(e.target.value); setEditAnnTargetFilter(""); }} className="block w-full mt-1.5 px-3 py-2 border border-blue-200 rounded-xl text-xs bg-white text-gray-900 outline-none cursor-pointer">
                      <option value="all">👥 All Users</option>
                      <option value="plan">💎 By Plan</option>
                      <option value="grade">🏫 By Grade</option>
                      <option value="course">📚 By Course</option>
                    </select>
                  </div>
                  {editAnnTargetAudience !== "all" && (
                    <div>
                      <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">Filter Value</label>
                      <input type="text" value={editAnnTargetFilter} onChange={(e) => setEditAnnTargetFilter(e.target.value)} placeholder={editAnnTargetAudience === "plan" ? "pro" : editAnnTargetAudience === "grade" ? "10" : "Mathematics"} className="block w-full mt-1.5 px-3 py-2 border border-blue-200 rounded-xl text-xs text-gray-900 bg-white outline-none" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Title</label>
                  <input type="text" required value={editAnnTitle} onChange={(e) => setEditAnnTitle(e.target.value)} className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Content</label>
                  <textarea rows={4} required value={editAnnContent} onChange={(e) => setEditAnnContent(e.target.value)} className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white outline-none focus:ring-1 focus:ring-brand resize-none" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditingAnn(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
                  <button onClick={handleSaveEditAnn} disabled={savingAnn} className="flex-1 py-2.5 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                    {savingAnn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save size={13} />}
                    {savingAnn ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Detail View */}
        {detailAnn && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full shadow-xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-brand to-brand-dark p-5 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold">{detailAnn.ann.title}</h3>
                  <p className="text-xs opacity-75 mt-0.5">{detailAnn.ann.type === "feedback" ? "Survey" : "Bulletin"} • {detailAnn.ann.display_type === "popup" ? "Popup" : "Pinned"}</p>
                </div>
                <button onClick={() => setDetailAnn(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">✕</button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Status", value: detailAnn.ann.is_active ? "Active" : "Paused", color: detailAnn.ann.is_active ? "text-emerald-600" : "text-gray-400" },
                    { label: "Display", value: detailAnn.ann.display_type === "popup" ? "🪟 Popup" : "📌 Pinned" },
                    { label: "Audience", value: !detailAnn.ann.target_audience || detailAnn.ann.target_audience === "all" ? "All Users" : `${detailAnn.ann.target_audience}: ${Object.values(detailAnn.ann.target_filter || {})[0] || "-"}` },
                    { label: "Created", value: new Date(detailAnn.ann.created_at).toLocaleDateString("tr-TR") },
                    { label: "Responses", value: String(detailAnn.responses.length) },
                    { label: "Questions", value: String(detailAnn.ann.questions?.length || 0) }
                  ].map((item: any) => (
                    <div key={item.label} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.label}</p>
                      <p className={`text-xs font-bold mt-0.5 ${item.color || "text-surface-dark"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Content</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{detailAnn.ann.content}</p>
                </div>

                {/* Questions list */}
                {detailAnn.ann.questions && detailAnn.ann.questions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Survey Questions</p>
                    {detailAnn.ann.questions.map((q: any, idx: number) => (
                      <div key={q.id || idx} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-gray-700">
                        <span className="font-bold text-purple-600 mr-1">Q{idx + 1}.</span> {q.question}
                      </div>
                    ))}
                  </div>
                )}

                {/* Responses */}
                {detailAnn.responses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">All Responses ({detailAnn.responses.length})</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {detailAnn.responses.map((resp: any) => (
                        <div key={resp.id} className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                          <p className="text-[10px] font-bold text-purple-700 mb-1.5">{resp.profiles?.full_name || "Anonymous"} • {new Date(resp.created_at).toLocaleString("tr-TR")}</p>
                          {Object.entries(resp.responses || {}).map(([key, val]: [string, any]) => (
                            <div key={key} className="text-[10px] text-gray-600 mb-0.5">
                              <span className="font-semibold text-gray-500">{key}:</span> {String(val)}
                            </div>
                          ))}
                          {Object.keys(resp.responses || {}).length === 0 && (
                            <p className="text-[10px] text-gray-400 italic">No answers submitted</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 shrink-0">
                <button onClick={() => setDetailAnn(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Change Plan / Trial Expiration */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 relative border border-gray-150 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <Sparkles className="text-brand animate-pulse" /> Adjust Access Level
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">For student: {selectedUser.full_name}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Target Tier</label>
                  <select
                    value={trialDuration}
                    onChange={(e) => setTrialDuration(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                  >
                    <option value="free">Free Tier (Standard Access)</option>
                    <option value="7">Pro Tier: 7 Days Trial</option>
                    <option value="30">Pro Tier: 30 Days Access</option>
                    <option value="custom">Pro Tier: Custom Days Trial</option>
                    <option value="lifetime">Pro Tier: Lifetime Access</option>
                  </select>
                </div>

                {trialDuration === "custom" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Number of Trial Days</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={3650}
                      value={customTrialDays}
                      onChange={(e) => setCustomTrialDays(e.target.value)}
                      placeholder="e.g. 14"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grace Days Granted</label>
                    <input
                      type="number"
                      min={0}
                      value={adjustGraceDays}
                      onChange={(e) => setAdjustGraceDays(Number(e.target.value))}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Failed Payment Retries</label>
                    <input
                      type="number"
                      min={0}
                      value={adjustFailedAttempts}
                      onChange={(e) => setAdjustFailedAttempts(Number(e.target.value))}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Next Billing Renewal Date</label>
                  <input
                    type="datetime-local"
                    value={adjustNextBilling}
                    onChange={(e) => setAdjustNextBilling(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePlan}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit User Role & Sub-Admin Permissions (Super Admin only) */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative border border-gray-150 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <UserCog className="text-brand" /> Edit Role & Permissions
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">User: {editingUser.full_name}</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">User Role</label>
                  <select
                    value={editingUserRole}
                    onChange={(e) => setEditingUserRole(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                  >
                    <option value="student">Student (Standard User)</option>
                    <option value="admin">Sub-Admin (Restricted Access)</option>
                    <option value="super_admin">Super Admin (Unrestricted Access)</option>
                  </select>
                </div>

                {editingUserRole === "admin" && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sub-Admin Permissions</label>
                    <div className="space-y-2.5 mt-1.5">
                      {[
                        { key: "manage_users", label: "Registered Students & Subscriptions" },
                        { key: "manage_promocodes", label: "Promo Codes Campaign Manager" },
                        { key: "manage_settings", label: "AI & R2 Configurations" },
                        { key: "manage_communications", label: "Announcements, Email & Notifications" },
                        { key: "view_logs", label: "View System Execution Logs" }
                      ].map((item) => {
                        const checked = editingUserPermissions.includes(item.key);
                        return (
                          <div 
                            key={item.key} 
                            onClick={() => togglePermissionCheckbox(item.key)}
                            className="flex items-center gap-2.5 p-2 rounded-xl border border-gray-100 hover:bg-gray-50/50 cursor-pointer text-xs font-semibold text-gray-700 transition-all"
                          >
                            {checked ? <CheckSquare size={16} className="text-brand" /> : <Square size={16} className="text-gray-400" />}
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <label className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 cursor-pointer">
                  <span>
                    <span className="block text-xs font-bold text-gray-700">Maintenance mode access</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">Allow this user to enter OnPace while maintenance mode is active.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={editingMaintenanceAccess}
                    onChange={(event) => setEditingMaintenanceAccess(event.target.checked)}
                    className="h-4 w-4 accent-amber-500"
                  />
                </label>

                <div className="pt-4 flex gap-3 border-t border-gray-100">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveUserPermissions}
                    disabled={savingPermissions}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1"
                  >
                    {savingPermissions && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: View Billing Details & Transaction History */}
        {viewingBillingDetails && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 relative border border-gray-150 shadow-xl max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <CreditCard className="text-brand" /> Subscription & Transaction History
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Billing details for: <span className="font-bold text-gray-700">{viewingBillingDetails.full_name}</span></p>
                </div>
                <button onClick={() => setViewingBillingDetails(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              {/* User Subscription Profile Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Current Tier</span>
                  <span className="font-bold text-surface-dark uppercase">{viewingBillingDetails.plan}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Billing Cycle</span>
                  <span className="font-bold text-surface-dark uppercase">{viewingBillingDetails.billing_cycle || "none"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Trial Start Date</span>
                  <span className="font-semibold text-gray-600">
                    {viewingBillingDetails.trial_start_at ? new Date(viewingBillingDetails.trial_start_at).toLocaleDateString() : "Not started"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Trial Expiration</span>
                  <span className="font-semibold text-gray-600">
                    {viewingBillingDetails.trial_ends_at ? new Date(viewingBillingDetails.trial_ends_at).toLocaleDateString() : "No active trial"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-xs mt-2">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Next Billing Date</span>
                  <span className="font-bold text-brand">
                    {viewingBillingDetails.next_billing_date ? new Date(viewingBillingDetails.next_billing_date).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Failed Payment Retries</span>
                  <span className={`font-bold ${viewingBillingDetails.failed_payment_attempts > 0 ? "text-red-500" : "text-gray-600"}`}>
                    {viewingBillingDetails.failed_payment_attempts || 0} Attempts
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Grace Days Granted</span>
                  <span className="font-semibold text-gray-600">
                    {viewingBillingDetails.grace_days_granted || 0} Extra Days
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-surface-dark uppercase tracking-wider">Transaction Records</h4>
                
                {loadingHistory ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  </div>
                ) : userPurchaseHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No transaction history exists for this user.</p>
                ) : (
                  <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150 text-[10px] uppercase font-bold text-gray-500">
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Plan Type</th>
                          <th className="px-4 py-2.5">Amount</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Payment Intent ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-600 bg-white">
                        {userPurchaseHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5">{new Date(item.created_at).toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-semibold text-surface-dark uppercase">{item.plan_type}</td>
                            <td className="px-4 py-2.5 font-bold text-green-600">${item.amount}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                item.status === "completed" ? "bg-green-50 text-green-600 border border-green-100" :
                                item.status === "failed" ? "bg-red-50 text-red-500 border border-red-100" :
                                "bg-amber-50 text-amber-500 border border-amber-100"
                              }`}>
                                {item.status || "completed"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[10px] text-gray-400">{item.stripe_payment_intent_id || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingBillingDetails(null)}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
                >
                  Close Records
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Student Profile */}
        {profileEditUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative border border-gray-150 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <User className="text-brand" /> Edit Student Profile
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Adjust information for user: {profileEditUser.full_name || "Anonymous"}</p>
                </div>
                <button onClick={() => setProfileEditUser(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileEditName}
                    onChange={(e) => setProfileEditName(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade / Goal Level</label>
                  <input
                    type="text"
                    required
                    value={profileEditGrade}
                    onChange={(e) => setProfileEditGrade(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileEditEmail}
                    onChange={(e) => setProfileEditEmail(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount Coupon Percentage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={profileEditDiscount}
                    onChange={(e) => setProfileEditDiscount(Number(e.target.value))}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div className="pt-4 flex gap-3 border-t border-gray-100">
                  <button
                    onClick={() => setProfileEditUser(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveStudentProfile}
                    disabled={savingStudentProfile}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1"
                  >
                    {savingStudentProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Promo Code */}
        {editingPromo && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative border border-gray-150 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <Tag className="text-brand" /> Edit Promo Code Campaign
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Adjust parameters for code: {editingPromo.code}</p>
                </div>
                <button onClick={() => setEditingPromo(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Promo Code String</label>
                  <input
                    type="text"
                    required
                    value={editingPromoCode}
                    onChange={(e) => setEditingPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GET30"
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount Type</label>
                    <select
                      value={editingPromoDiscountType}
                      onChange={(e) => setEditingPromoDiscountType(e.target.value as any)}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                    >
                      <option value="percentage">Percentage Discount</option>
                      <option value="free_trial">Free Pro Trial Days</option>
                      <option value="lifetime">Lifetime Pro Upgrade</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount Value</label>
                    <input
                      type="number"
                      required
                      min={0}
                      disabled={editingPromoDiscountType === "lifetime"}
                      value={editingPromoDiscountType === "lifetime" ? "" : editingPromoDiscountValue}
                      onChange={(e) => setEditingPromoDiscountValue(Number(e.target.value))}
                      placeholder={editingPromoDiscountType === "lifetime" ? "N/A" : "Value"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Usage Limit</label>
                    <input
                      type="number"
                      value={editingPromoMaxUses}
                      onChange={(e) => setEditingPromoMaxUses(e.target.value)}
                      placeholder="∞ (Unlimited)"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={editingPromoStartDate}
                      onChange={(e) => setEditingPromoStartDate(e.target.value)}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Date (Expiration)</label>
                  <input
                    type="datetime-local"
                    required
                    value={editingPromoEndDate}
                    onChange={(e) => setEditingPromoEndDate(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div className="pt-4 flex gap-3 border-t border-gray-100">
                  <button
                    onClick={() => setEditingPromo(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePromoCode}
                    disabled={savingPromo}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1"
                  >
                    {savingPromo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
