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
  AlertCircle,
  BookOpen,
  MapPin
} from "lucide-react";
import { formatBugReportTrackingNumber } from "@/lib/bug-report";
import { SubscriptionOperationsPanel } from "@/components/admin/SubscriptionOperationsPanel";
import { BulkAccessControls } from "@/components/admin/BulkAccessControls";

interface IntegrationConfigResponse {
  error?: unknown;
  has_gemini?: boolean;
  has_openai?: boolean;
  has_resend?: boolean;
  active_provider?: string;
  openai_routing_mode?: string;
  openai_default_model?: string;
  email_from_address?: string;
  email_from_name?: string;
  has_r2_access_key?: boolean;
  has_r2_secret_key?: boolean;
  r2_endpoint?: string;
  r2_bucket_name?: string;
  r2_public_url?: string;
}

type MaintenanceLanguage = "en" | "tr" | "es" | "zh";
type AdminLanguage = MaintenanceLanguage;
type PaymentPlanKey = "pro_monthly" | "pro_yearly" | "founding_member";
type PaymentCheckoutUrls = Record<PaymentPlanKey, string>;
type LocalizedPlanNames = Record<PaymentPlanKey, Record<MaintenanceLanguage, string>>;
type MaintenanceContent = Record<MaintenanceLanguage, {
  badge: string;
  title: string;
  description: string;
  coming_title: string;
  coming_items: string[];
  back_soon: string;
}>;

const DEFAULT_PAYMENT_CHECKOUT_URLS: PaymentCheckoutUrls = {
  pro_monthly: "https://eshipx.com/store/onpace/onpacemonthly",
  pro_yearly: "",
  founding_member: "",
};

const DEFAULT_LOCALIZED_PLAN_NAMES: LocalizedPlanNames = {
  pro_monthly: { en: "Pro Monthly", tr: "Pro Aylık", es: "Pro Mensual", zh: "Pro 月度版" },
  pro_yearly: { en: "Pro Yearly", tr: "Pro Yıllık", es: "Pro Anual", zh: "Pro 年度版" },
  founding_member: { en: "Founding Member", tr: "Kurucu Üye", es: "Miembro Fundador", zh: "创始会员" },
};

const PAYMENT_SETTINGS_COPY = {
  en: { accept: "Accept EshipX payments", acceptHelp: "Open or close package purchases instantly.", catalog: "EshipX package catalog", catalogHelp: "Set the destination link for each package. Only secure EshipX links are accepted.", links: "Payment links", names: "Localized package names", monthly: "Monthly", yearly: "Yearly", lifetime: "Lifetime / Founding", enabled: "Payments are open", disabled: "Payments are closed", saveHint: "Link and name changes take effect after saving system settings." },
  tr: { accept: "eShipX ödemelerini kabul et", acceptHelp: "Paket satın alımlarını anında açın veya kapatın.", catalog: "eShipX paket kataloğu", catalogHelp: "Her paketin yönleneceği ödeme bağlantısını belirleyin. Yalnızca güvenli eShipX bağlantıları kabul edilir.", links: "Ödeme bağlantıları", names: "Dile özel paket adları", monthly: "Aylık", yearly: "Yıllık", lifetime: "Ömür boyu / Kurucu", enabled: "Ödemeler açık", disabled: "Ödemeler kapalı", saveHint: "Bağlantı ve ad değişiklikleri sistem ayarlarını kaydettikten sonra geçerli olur." },
  es: { accept: "Aceptar pagos de EshipX", acceptHelp: "Activa o desactiva las compras de planes al instante.", catalog: "Catálogo de planes de EshipX", catalogHelp: "Define el enlace de pago de cada plan. Solo se aceptan enlaces seguros de EshipX.", links: "Enlaces de pago", names: "Nombres localizados de los planes", monthly: "Mensual", yearly: "Anual", lifetime: "De por vida / Fundador", enabled: "Pagos activados", disabled: "Pagos desactivados", saveHint: "Los cambios de enlaces y nombres se aplican al guardar los ajustes del sistema." },
  zh: { accept: "接受 EshipX 付款", acceptHelp: "即时开启或关闭套餐购买。", catalog: "EshipX 套餐目录", catalogHelp: "为每个套餐设置付款目标链接，仅接受安全的 EshipX 链接。", links: "付款链接", names: "多语言套餐名称", monthly: "月度", yearly: "年度", lifetime: "终身 / 创始会员", enabled: "付款已开启", disabled: "付款已关闭", saveHint: "链接和名称将在保存系统设置后生效。" },
} as const;

function normalizePaymentCheckoutUrls(value: unknown): PaymentCheckoutUrls {
  const source = value && typeof value === "object" ? value as Partial<Record<PaymentPlanKey, unknown>> : {};
  return {
    pro_monthly: typeof source.pro_monthly === "string" ? source.pro_monthly : DEFAULT_PAYMENT_CHECKOUT_URLS.pro_monthly,
    pro_yearly: typeof source.pro_yearly === "string" ? source.pro_yearly : "",
    founding_member: typeof source.founding_member === "string" ? source.founding_member : "",
  };
}

function normalizeLocalizedPlanNames(value: unknown): LocalizedPlanNames {
  const source = value && typeof value === "object" ? value as Partial<Record<PaymentPlanKey, unknown>> : {};
  return (Object.keys(DEFAULT_LOCALIZED_PLAN_NAMES) as PaymentPlanKey[]).reduce((result, plan) => {
    const localized = source[plan] && typeof source[plan] === "object"
      ? source[plan] as Partial<Record<MaintenanceLanguage, unknown>>
      : {};
    result[plan] = (Object.keys(DEFAULT_LOCALIZED_PLAN_NAMES[plan]) as MaintenanceLanguage[]).reduce((names, language) => {
      names[language] = typeof localized[language] === "string" && localized[language]?.trim()
        ? localized[language]!.trim()
        : DEFAULT_LOCALIZED_PLAN_NAMES[plan][language];
      return names;
    }, {} as Record<MaintenanceLanguage, string>);
    return result;
  }, {} as LocalizedPlanNames);
}

const ADMIN_UI_COPY = {
  en: {
    back: "Back to Dashboard", title: "Administrator Panel", subtitle: "Manage user profiles, promotional discount campaigns, and system parameters.",
    superConsole: "Super Admin Console", subConsole: "Sub-Admin Console", totalStudents: "Total Registered Students", proMembers: "Active Pro Members", proRatio: "Pro Ratio", totalAdmins: "Total Administrators",
    usersTab: "Users & Stats", promosTab: "Promo codes", paymentsTab: "Payments & Plans", configTab: "System Config", logsTab: "Audit Logs", bugsTab: "Bug Reports & AI Analytics", coursesTab: "Course Selections",
    registered: "Registered students", name: "Full name", grade: "Grade level", subscription: "Subscription plan", expiration: "Expiration / status", role: "Admin role", actions: "Actions", emptyUsers: "No users registered yet.", anonymous: "Anonymous user", unspecified: "Not specified", founding: "Founding", monthly: "Monthly plan", yearly: "Yearly plan", renews: "Renews", lifetime: "Lifetime access", proTrial: "Pro trial", freeActive: "Free active", student: "Student", subAdmin: "Sub-admin", setPlan: "Set plan", history: "History", cancelSub: "Cancel subscription", editProfile: "Edit profile", editRole: "Edit role", deleteUser: "Delete",
  },
  tr: {
    back: "Panele dön", title: "Yönetici Paneli", subtitle: "Kullanıcı profillerini, promosyon kampanyalarını ve sistem ayarlarını yönetin.",
    superConsole: "Süper Yönetici Konsolu", subConsole: "Alt Yönetici Konsolu", totalStudents: "Toplam kayıtlı öğrenci", proMembers: "Aktif Pro üyeler", proRatio: "Pro oranı", totalAdmins: "Toplam yönetici",
    usersTab: "Kullanıcılar ve İstatistikler", promosTab: "Promosyon Kodları", paymentsTab: "Ödeme ve Paketler", configTab: "Sistem Ayarları", logsTab: "İşlem Kayıtları", bugsTab: "Hata Bildirimleri ve AI Analizi", coursesTab: "Ders Seçimleri",
    registered: "Kayıtlı öğrenciler", name: "Ad soyad", grade: "Sınıf seviyesi", subscription: "Abonelik paketi", expiration: "Bitiş / durum", role: "Yönetici rolü", actions: "İşlemler", emptyUsers: "Henüz kayıtlı kullanıcı yok.", anonymous: "İsimsiz kullanıcı", unspecified: "Belirtilmemiş", founding: "Kurucu", monthly: "Aylık paket", yearly: "Yıllık paket", renews: "Yenilenme", lifetime: "Ömür boyu erişim", proTrial: "Pro deneme", freeActive: "Ücretsiz aktif", student: "Öğrenci", subAdmin: "Alt yönetici", setPlan: "Paket tanımla", history: "Geçmiş", cancelSub: "Aboneliği iptal et", editProfile: "Profili düzenle", editRole: "Rolü düzenle", deleteUser: "Sil",
  },
  es: {
    back: "Volver al panel", title: "Panel de administración", subtitle: "Gestiona perfiles de usuario, campañas promocionales y parámetros del sistema.",
    superConsole: "Consola de superadministrador", subConsole: "Consola de subadministrador", totalStudents: "Total de estudiantes registrados", proMembers: "Miembros Pro activos", proRatio: "Proporción Pro", totalAdmins: "Total de administradores",
    usersTab: "Usuarios y estadísticas", promosTab: "Códigos promocionales", paymentsTab: "Pagos y planes", configTab: "Configuración", logsTab: "Registro de auditoría", bugsTab: "Errores y análisis de IA", coursesTab: "Selección de cursos",
    registered: "Estudiantes registrados", name: "Nombre completo", grade: "Nivel", subscription: "Plan", expiration: "Vencimiento / estado", role: "Rol administrativo", actions: "Acciones", emptyUsers: "Aún no hay usuarios registrados.", anonymous: "Usuario anónimo", unspecified: "No especificado", founding: "Fundador", monthly: "Plan mensual", yearly: "Plan anual", renews: "Renueva", lifetime: "Acceso de por vida", proTrial: "Prueba Pro", freeActive: "Gratis activo", student: "Estudiante", subAdmin: "Subadministrador", setPlan: "Asignar plan", history: "Historial", cancelSub: "Cancelar suscripción", editProfile: "Editar perfil", editRole: "Editar rol", deleteUser: "Eliminar",
  },
  zh: {
    back: "返回工作台", title: "管理面板", subtitle: "管理用户资料、优惠活动和系统参数。",
    superConsole: "超级管理员控制台", subConsole: "子管理员控制台", totalStudents: "注册学生总数", proMembers: "活跃 Pro 会员", proRatio: "Pro 占比", totalAdmins: "管理员总数",
    usersTab: "用户与统计", promosTab: "优惠码", paymentsTab: "付款与套餐", configTab: "系统设置", logsTab: "审计日志", bugsTab: "错误报告与 AI 分析", coursesTab: "课程选择",
    registered: "已注册学生", name: "姓名", grade: "年级", subscription: "订阅套餐", expiration: "到期 / 状态", role: "管理员角色", actions: "操作", emptyUsers: "暂无注册用户。", anonymous: "匿名用户", unspecified: "未填写", founding: "创始会员", monthly: "月度套餐", yearly: "年度套餐", renews: "续费时间", lifetime: "终身权限", proTrial: "Pro 试用", freeActive: "免费套餐有效", student: "学生", subAdmin: "子管理员", setPlan: "设置套餐", history: "历史", cancelSub: "取消订阅", editProfile: "编辑资料", editRole: "编辑角色", deleteUser: "删除",
  },
} as const;

const PROMO_ADMIN_COPY = {
  en: {
    title: "Promo codes & trial access", description: "Create exact-duration campaigns and manage every redeemed trial from one place.", create: "Create promo code",
    promoCode: "Promo code", type: "Benefit type", percentage: "Percentage discount", freeTrial: "Free Pro trial (days)", lifetime: "Lifetime Pro access",
    value: "Discount / trial value", trialDays: "Trial days", maxUses: "Maximum uses", unlimited: "Unlimited", start: "Start date", end: "End date",
    created: "Promo code created.", code: "Code", details: "Benefit", usage: "Usage", dates: "Valid dates", status: "Status", actions: "Actions",
    noPromos: "No promo campaigns have been created.", expired: "Expired", limitReached: "Limit reached", active: "Active", edit: "Edit", delete: "Delete",
    redemptions: "Promo trial users", redemptionHelp: "View who used each code and adjust their exact trial dates.", allCodes: "All codes", user: "User",
    benefit: "Granted benefit", trialPeriod: "Trial period", redeemed: "Redeemed", manage: "Manage", noRedemptions: "No users have redeemed this code yet.",
    proTrial: "free Pro trial", freeTier: "Free tier", proTier: "Pro tier", days: "days", expires: "Expires", trialExpired: "Trial expired",
    adjustTitle: "Adjust trial access", forStudent: "Student", targetTier: "Access type", customTrial: "Custom Pro trial", exactStart: "Trial start",
    exactEnd: "Trial end", extraDays: "Add extra days", addDays: "Add days", graceDays: "Grace days", failedRetries: "Failed payment retries",
    nextBilling: "Next billing date", save: "Save access", cancel: "Cancel", invalidDays: "Trial days must be at least 1.", invalidDates: "Trial end must be later than trial start.",
  },
  tr: {
    title: "Promosyon kodları ve deneme erişimi", description: "Kesin süreli kampanyalar oluşturun ve kod kullanan tüm deneme hesaplarını tek yerden yönetin.", create: "Promosyon kodu oluştur",
    promoCode: "Promosyon kodu", type: "Avantaj türü", percentage: "Yüzde indirim", freeTrial: "Ücretsiz Pro deneme (gün)", lifetime: "Ömür boyu Pro erişim",
    value: "İndirim / deneme değeri", trialDays: "Deneme günü", maxUses: "Azami kullanım", unlimited: "Sınırsız", start: "Başlangıç", end: "Bitiş",
    created: "Promosyon kodu oluşturuldu.", code: "Kod", details: "Avantaj", usage: "Kullanım", dates: "Geçerlilik", status: "Durum", actions: "İşlemler",
    noPromos: "Henüz promosyon kampanyası oluşturulmadı.", expired: "Süresi doldu", limitReached: "Limit doldu", active: "Aktif", edit: "Düzenle", delete: "Sil",
    redemptions: "Promosyon denemesi kullananlar", redemptionHelp: "Her kodu kullanan kişileri görün ve kesin deneme tarihlerini düzenleyin.", allCodes: "Tüm kodlar", user: "Kullanıcı",
    benefit: "Verilen avantaj", trialPeriod: "Deneme süresi", redeemed: "Kullanım tarihi", manage: "Yönet", noRedemptions: "Bu kodu henüz kullanan olmadı.",
    proTrial: "ücretsiz Pro deneme", freeTier: "Ücretsiz paket", proTier: "Pro paket", days: "gün", expires: "Bitiş", trialExpired: "Deneme bitti",
    adjustTitle: "Deneme erişimini düzenle", forStudent: "Öğrenci", targetTier: "Erişim türü", customTrial: "Özel Pro deneme", exactStart: "Deneme başlangıcı",
    exactEnd: "Deneme bitişi", extraDays: "Ek gün ver", addDays: "Gün ekle", graceDays: "Ek tolerans günü", failedRetries: "Başarısız ödeme denemesi",
    nextBilling: "Sonraki ödeme tarihi", save: "Erişimi kaydet", cancel: "İptal", invalidDays: "Deneme günü en az 1 olmalıdır.", invalidDates: "Deneme bitişi başlangıçtan sonra olmalıdır.",
  },
  es: {
    title: "Códigos promocionales y pruebas", description: "Crea campañas con duración exacta y administra todas las pruebas canjeadas desde un solo lugar.", create: "Crear código promocional",
    promoCode: "Código promocional", type: "Tipo de beneficio", percentage: "Descuento porcentual", freeTrial: "Prueba Pro gratis (días)", lifetime: "Acceso Pro de por vida",
    value: "Valor del descuento / prueba", trialDays: "Días de prueba", maxUses: "Usos máximos", unlimited: "Ilimitado", start: "Fecha de inicio", end: "Fecha de fin",
    created: "Código promocional creado.", code: "Código", details: "Beneficio", usage: "Uso", dates: "Vigencia", status: "Estado", actions: "Acciones",
    noPromos: "No hay campañas promocionales.", expired: "Caducado", limitReached: "Límite alcanzado", active: "Activo", edit: "Editar", delete: "Eliminar",
    redemptions: "Usuarios de prueba promocional", redemptionHelp: "Consulta quién usó cada código y ajusta sus fechas exactas de prueba.", allCodes: "Todos los códigos", user: "Usuario",
    benefit: "Beneficio otorgado", trialPeriod: "Periodo de prueba", redeemed: "Canjeado", manage: "Gestionar", noRedemptions: "Nadie ha canjeado este código todavía.",
    proTrial: "prueba Pro gratuita", freeTier: "Plan gratuito", proTier: "Plan Pro", days: "días", expires: "Finaliza", trialExpired: "Prueba finalizada",
    adjustTitle: "Ajustar acceso de prueba", forStudent: "Estudiante", targetTier: "Tipo de acceso", customTrial: "Prueba Pro personalizada", exactStart: "Inicio de la prueba",
    exactEnd: "Fin de la prueba", extraDays: "Añadir días extra", addDays: "Añadir días", graceDays: "Días de gracia", failedRetries: "Reintentos de pago fallidos",
    nextBilling: "Próxima fecha de cobro", save: "Guardar acceso", cancel: "Cancelar", invalidDays: "La prueba debe durar al menos 1 día.", invalidDates: "El fin de la prueba debe ser posterior al inicio.",
  },
  zh: {
    title: "优惠码与试用权限", description: "创建精确天数的活动，并在一个位置管理所有已兑换的试用账户。", create: "创建优惠码",
    promoCode: "优惠码", type: "权益类型", percentage: "百分比折扣", freeTrial: "免费 Pro 试用（天）", lifetime: "终身 Pro 权限",
    value: "折扣 / 试用数值", trialDays: "试用天数", maxUses: "最大使用次数", unlimited: "不限", start: "开始日期", end: "结束日期",
    created: "优惠码已创建。", code: "代码", details: "权益", usage: "使用情况", dates: "有效日期", status: "状态", actions: "操作",
    noPromos: "尚未创建优惠活动。", expired: "已过期", limitReached: "已达上限", active: "有效", edit: "编辑", delete: "删除",
    redemptions: "优惠试用用户", redemptionHelp: "查看每个代码的使用者并调整其准确试用日期。", allCodes: "全部代码", user: "用户",
    benefit: "已授予权益", trialPeriod: "试用期间", redeemed: "兑换时间", manage: "管理", noRedemptions: "尚无人使用此代码。",
    proTrial: "免费 Pro 试用", freeTier: "免费版", proTier: "Pro 版", days: "天", expires: "结束", trialExpired: "试用已结束",
    adjustTitle: "调整试用权限", forStudent: "学生", targetTier: "权限类型", customTrial: "自定义 Pro 试用", exactStart: "试用开始",
    exactEnd: "试用结束", extraDays: "增加额外天数", addDays: "增加天数", graceDays: "宽限天数", failedRetries: "付款失败次数",
    nextBilling: "下次付款日期", save: "保存权限", cancel: "取消", invalidDays: "试用天数至少为 1 天。", invalidDates: "试用结束时间必须晚于开始时间。",
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

function toLocalDateTimeInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
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
  const [promoRedemptions, setPromoRedemptions] = useState<any[]>([]);
  const [promoLoadError, setPromoLoadError] = useState("");
  const [promoRedemptionFilter, setPromoRedemptionFilter] = useState("all");
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
  const [openaiRoutingMode, setOpenaiRoutingMode] = useState<"smart" | "single">("smart");
  const [openaiDefaultModel, setOpenaiDefaultModel] = useState<"gpt-4o-mini" | "gpt-5.6-luna">("gpt-5.6-luna");
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
  const [paymentCheckoutUrls, setPaymentCheckoutUrls] = useState<PaymentCheckoutUrls>(DEFAULT_PAYMENT_CHECKOUT_URLS);
  const [localizedPlanNames, setLocalizedPlanNames] = useState<LocalizedPlanNames>(DEFAULT_LOCALIZED_PLAN_NAMES);
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
  const [emailTargetLanguage, setEmailTargetLanguage] = useState("all");
  const [emailTargetGrade, setEmailTargetGrade] = useState("all");
  const [emailTargetRole, setEmailTargetRole] = useState("all");
  const [emailUserSearch, setEmailUserSearch] = useState("");
  const [emailSelectedUserIds, setEmailSelectedUserIds] = useState<string[]>([]);
  const [emailCtaLabel, setEmailCtaLabel] = useState("");
  const [emailCtaLabelTR, setEmailCtaLabelTR] = useState("");
  const [emailCtaLabelES, setEmailCtaLabelES] = useState("");
  const [emailCtaLabelZH, setEmailCtaLabelZH] = useState("");
  const [emailCtaUrl, setEmailCtaUrl] = useState("");
  const [emailRewardEnabled, setEmailRewardEnabled] = useState(false);
  const [emailRewardPlan, setEmailRewardPlan] = useState("pro");
  const [emailRewardDays, setEmailRewardDays] = useState("7");
  const [emailRewardValidDays, setEmailRewardValidDays] = useState("7");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [translatingEmail, setTranslatingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  // Bug Reports Tab States
  const [bugReports, setBugReports] = useState<any[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(false);
  const [bugFilterCode, setBugFilterCode] = useState("all");
  const [selectedBugScreenshot, setSelectedBugScreenshot] = useState<string | null>(null);

  // Course selection audit states
  const [courseSelections, setCourseSelections] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");

  // Adjust Plan Modal States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [trialDuration, setTrialDuration] = useState("7"); // "7", "30", "lifetime", "free", "custom"
  const [customTrialDays, setCustomTrialDays] = useState("14");
  const [adjustGraceDays, setAdjustGraceDays] = useState(0);
  const [adjustFailedAttempts, setAdjustFailedAttempts] = useState(0);
  const [adjustNextBilling, setAdjustNextBilling] = useState("");
  const [adjustTrialStart, setAdjustTrialStart] = useState("");
  const [adjustTrialEnd, setAdjustTrialEnd] = useState("");
  const [extraTrialDays, setExtraTrialDays] = useState("1");

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

  const adminLanguage: AdminLanguage = ["en", "tr", "es", "zh"].includes(currentUserProfile?.language)
    ? currentUserProfile.language
    : "en";
  const promoCopy = PROMO_ADMIN_COPY[adminLanguage];
  const paymentSettingsCopy = PAYMENT_SETTINGS_COPY[adminLanguage];
  const durationMismatchLabel = adminLanguage === "tr"
    ? "Süre uyuşmazlığı"
    : adminLanguage === "es"
      ? "Duración incoherente"
      : adminLanguage === "zh"
        ? "时长不一致"
        : "Duration mismatch";
  const adminDateLocale = adminLanguage === "tr" ? "tr-TR" : adminLanguage === "es" ? "es-ES" : adminLanguage === "zh" ? "zh-CN" : "en-US";
  const visiblePromoRedemptions = promoRedemptionFilter === "all"
    ? promoRedemptions
    : promoRedemptions.filter((redemption) => redemption.promocode_id === promoRedemptionFilter);

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
      fetchCourseSelections();
      
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
      .rpc("admin_get_trial_profiles");
    
    if (!error && data) {
      setProfiles(data);
    } else {
      console.warn("RPC admin_get_trial_profiles failed, falling back to profiles table select:", error);
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
      setOpenaiRoutingMode(integrationData.openai_routing_mode === "single" ? "single" : "smart");
      setOpenaiDefaultModel(integrationData.openai_default_model === "gpt-4o-mini" ? "gpt-4o-mini" : "gpt-5.6-luna");
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
      setPaymentCheckoutUrls(normalizePaymentCheckoutUrls(sysData.payment_checkout_urls));
      setLocalizedPlanNames(normalizeLocalizedPlanNames(sysData.plan_names));
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
        paymentGatewayEnabled,
        paymentProvider: "eshipx",
        paymentCheckoutUrls,
        planNames: localizedPlanNames,
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

  const handlePaymentGatewayChange = async (enabled: boolean) => {
    const previous = paymentGatewayEnabled;
    setPaymentGatewayEnabled(enabled);
    setSavingSystemSettings(true);
    setSystemSettingsError(null);
    try {
      await requestIntegrationConfig({
        paymentGatewayEnabled: enabled,
        paymentProvider: "eshipx",
        ...(enabled ? { paymentCheckoutUrls, planNames: localizedPlanNames } : {}),
      });
      setSaveSystemSettingsSuccess(true);
      setTimeout(() => setSaveSystemSettingsSuccess(false), 3000);
    } catch (error) {
      setPaymentGatewayEnabled(previous);
      setSystemSettingsError(error instanceof Error ? error.message : "Ödeme ayarı değiştirilemedi.");
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

  async function fetchCourseSelections() {
    setLoadingCourses(true);
    const { data, error } = await supabase.rpc("admin_get_course_selections");
    if (!error && data) setCourseSelections(data);
    setLoadingCourses(false);
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
    setPromoLoadError("");
    const [promoResult, redemptionResult] = await Promise.all([
      supabase.from("promocodes").select("*").order("created_at", { ascending: false }),
      supabase.rpc("admin_get_promo_redemptions"),
    ]);
    if (!promoResult.error && promoResult.data) setPromocodes(promoResult.data);
    if (!redemptionResult.error && redemptionResult.data) setPromoRedemptions(redemptionResult.data);
    const loadError = promoResult.error?.message || redemptionResult.error?.message;
    if (loadError) setPromoLoadError(loadError);
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
        openaiRoutingMode,
        openaiDefaultModel,
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
    const start = user.trial_start_at ? new Date(user.trial_start_at) : new Date();
    const end = user.trial_ends_at ? new Date(user.trial_ends_at) : new Date(start.getTime() + 3 * 86_400_000);
    const currentDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    setCustomTrialDays(String(currentDays));
    setAdjustTrialStart(toLocalDateTimeInput(start));
    setAdjustTrialEnd(toLocalDateTimeInput(end));
    setExtraTrialDays("1");
    setAdjustGraceDays(user.grace_days_granted || 0);
    setAdjustFailedAttempts(user.failed_payment_attempts || 0);
    setAdjustNextBilling(user.next_billing_date ? new Date(user.next_billing_date).toISOString().slice(0, 16) : "");
  };

  const handleUpdatePlan = async () => {
    if (!selectedUser) return;
    setUpdatingId(selectedUser.id);

    let nextPlan = "free";
    let startsAt: string | null = null;
    let expiresAt: string | null = null;

    if (trialDuration !== "free") {
      nextPlan = "pro";
      if (trialDuration === "lifetime") {
        expiresAt = null; // Lifetime
      } else {
        const start = adjustTrialStart ? new Date(adjustTrialStart) : new Date();
        const end = adjustTrialEnd ? new Date(adjustTrialEnd) : null;
        if (!end || end <= start) {
          alert(promoCopy.invalidDates);
          setUpdatingId(null);
          return;
        }
        startsAt = start.toISOString();
        expiresAt = end.toISOString();
      }
    }

    const targetNextBilling = adjustNextBilling.trim() ? new Date(adjustNextBilling).toISOString() : null;

    const { error } = await supabase.rpc("admin_update_trial_access", {
      p_user_id: selectedUser.id,
      p_plan: nextPlan,
      p_trial_start: startsAt,
      p_trial_end: expiresAt,
      p_grace_days: Number(adjustGraceDays),
      p_failed_attempts: Number(adjustFailedAttempts),
      p_next_billing: targetNextBilling
    });

    if (!error) {
      setProfiles(profiles.map(p => 
        p.id === selectedUser.id 
          ? { 
              ...p, 
              plan: nextPlan, 
              trial_start_at: startsAt,
              trial_ends_at: expiresAt,
              subscription_status: nextPlan === "free" ? "none" : expiresAt ? "trialing" : "active",
              grace_days_granted: Number(adjustGraceDays),
              failed_payment_attempts: Number(adjustFailedAttempts),
              next_billing_date: targetNextBilling
            } 
          : p
      ));
      setPromoRedemptions((current) => current.map((redemption) =>
        redemption.user_id === selectedUser.id
          ? { ...redemption, trial_started_at: startsAt, trial_ends_at: expiresAt, plan: nextPlan, subscription_status: nextPlan === "free" ? "none" : expiresAt ? "trialing" : "active" }
          : redemption
      ));
    } else {
      alert("Failed to update plan: " + error.message);
    }

    setUpdatingId(null);
    setSelectedUser(null);
  };

  const handleTrialDurationChange = (value: string) => {
    setTrialDuration(value);
    if (value === "free" || value === "lifetime") return;
    const days = value === "7" ? 7 : value === "30" ? 30 : Math.max(1, Number(customTrialDays) || 3);
    const start = new Date();
    const end = new Date(start.getTime() + days * 86_400_000);
    setAdjustTrialStart(toLocalDateTimeInput(start));
    setAdjustTrialEnd(toLocalDateTimeInput(end));
    setCustomTrialDays(String(days));
  };

  const handleCustomTrialDaysChange = (value: string) => {
    setCustomTrialDays(value);
    const days = Number(value);
    if (!Number.isFinite(days) || days < 1) return;
    const start = adjustTrialStart ? new Date(adjustTrialStart) : new Date();
    setAdjustTrialEnd(toLocalDateTimeInput(new Date(start.getTime() + days * 86_400_000)));
  };

  const handleAddTrialDays = () => {
    const days = Number(extraTrialDays);
    if (!Number.isFinite(days) || days < 1) {
      alert(promoCopy.invalidDays);
      return;
    }
    const base = adjustTrialEnd ? new Date(adjustTrialEnd) : new Date();
    setAdjustTrialEnd(toLocalDateTimeInput(new Date(base.getTime() + days * 86_400_000)));
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
    const numericValue = discountType === "lifetime" ? 0 : Number(discountValue);
    if (discountType === "free_trial" && numericValue < 1) {
      alert(promoCopy.invalidDays);
      return;
    }
    setCreatingPromo(true);
    setPromoSuccess(false);

    const payload = {
      code: newPromoCode.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: numericValue,
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
      setDiscountValue(discountType === "free_trial" ? 3 : 20);
      await fetchPromocodes();
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
    const numericValue = editingPromoDiscountType === "lifetime" ? 0 : Number(editingPromoDiscountValue);
    if (editingPromoDiscountType === "free_trial" && numericValue < 1) {
      alert(promoCopy.invalidDays);
      return;
    }
    setSavingPromo(true);

    const payload = {
      code: editingPromoCode.trim().toUpperCase(),
      discount_type: editingPromoDiscountType,
      discount_value: numericValue,
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
      await fetchPromocodes();
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
  const canManageBilling = isSuperAdmin || perms.includes("manage_billing");
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
          targetPlan: emailTargetPlan === "all" ? null : emailTargetPlan,
          targetLanguage:
            emailTargetLanguage === "all" ? null : emailTargetLanguage,
          targetGrade: emailTargetGrade === "all" ? null : emailTargetGrade,
          targetRole: emailTargetRole === "all" ? null : emailTargetRole,
          targetUserIds: emailSelectedUserIds,
          emailSearch: emailUserSearch.trim() || null,
          ctaLabel: {
            en: emailCtaLabel,
            tr: emailCtaLabelTR,
            es: emailCtaLabelES,
            zh: emailCtaLabelZH,
          },
          ctaUrl: emailRewardEnabled ? null : emailCtaUrl.trim() || null,
          rewardEnabled: emailRewardEnabled,
          rewardPlan: emailRewardPlan,
          rewardDays: Number(emailRewardDays),
          rewardValidDays: Number(emailRewardValidDays),
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
        setEmailCtaLabel("");
        setEmailCtaLabelTR("");
        setEmailCtaLabelES("");
        setEmailCtaLabelZH("");
        setEmailCtaUrl("");
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
    canManageBilling ||
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
    <div className="min-h-screen bg-[#F8F9FC] p-3 font-sans sm:p-5 lg:p-8">
      <div className="mx-auto w-full max-w-[1800px] space-y-6 lg:space-y-8">
        
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
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-gray-200 pb-px">
          {(isSuperAdmin || perms.includes("manage_users")) && (
            <button
              onClick={() => setActiveTab("users")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "users" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              👥 {adminText.usersTab}
            </button>
          )}
          {(isSuperAdmin || perms.includes("manage_promocodes")) && (
            <button
              onClick={() => setActiveTab("promocodes")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "promocodes" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              🏷️ {adminText.promosTab}
            </button>
          )}
          {canManageBilling && (
            <button
              onClick={() => setActiveTab("billing_operations")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "billing_operations" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {adminText.paymentsTab}
            </button>
          )}
          {(isSuperAdmin || perms.includes("manage_settings")) && (
            <button
              onClick={() => setActiveTab("config")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "config" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              ⚙️ {adminText.configTab}
            </button>
          )}
          {(isSuperAdmin || perms.includes("view_logs")) && (
            <button
              onClick={() => setActiveTab("logs")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "logs" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📋 {adminText.logsTab}
            </button>
          )}
          <button
            onClick={() => setActiveTab("bugs")}
            className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "bugs" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🐞 {adminText.bugsTab}
          </button>
          {canManageUsers && (
            <button
              onClick={() => setActiveTab("courses")}
              className={`pb-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "courses" ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📚 {adminText.coursesTab}
            </button>
          )}
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
                      <option value="openai">OpenAI (Smart model routing)</option>
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
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">OpenAI Routing Strategy</label>
                    <select
                      value={openaiRoutingMode}
                      onChange={(e) => setOpenaiRoutingMode(e.target.value === "single" ? "single" : "smart")}
                      disabled={activeProvider !== "openai"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="smart">Smart routing (Recommended)</option>
                      <option value="single">Use one model for every request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Single / Fallback Model</label>
                    <select
                      value={openaiDefaultModel}
                      onChange={(e) => setOpenaiDefaultModel(e.target.value === "gpt-4o-mini" ? "gpt-4o-mini" : "gpt-5.6-luna")}
                      disabled={activeProvider !== "openai" || openaiRoutingMode !== "single"}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="gpt-5.6-luna">GPT-5.6 Luna — higher study quality</option>
                      <option value="gpt-4o-mini">GPT-4o mini — lowest cost</option>
                    </select>
                  </div>
                </div>

                {activeProvider === "openai" && openaiRoutingMode === "smart" && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-3 text-[11px] text-indigo-900">
                    <p className="font-bold">Smart routing is active</p>
                    <p className="mt-1 leading-relaxed">
                      Study plans, task breakdowns, quizzes, learning analysis and study visuals use GPT-5.6 Luna. Short chat, moderation, translation and duplicate detection use GPT-4o mini.
                    </p>
                  </div>
                )}

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
                      <p className="text-xs font-bold text-surface-dark">💳 {paymentSettingsCopy.accept}</p>
                      <p className="text-[10px] text-gray-500">{paymentSettingsCopy.acceptHelp}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={paymentGatewayEnabled}
                      onChange={(e) => void handlePaymentGatewayChange(e.target.checked)}
                      disabled={savingSystemSettings}
                      title={paymentSettingsCopy.accept}
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

                <div className="rounded-3xl border border-indigo-100 bg-indigo-50/35 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-surface-dark">{paymentSettingsCopy.catalog}</h3>
                      <p className="mt-1 max-w-3xl text-[11px] leading-5 text-gray-500">{paymentSettingsCopy.catalogHelp}</p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black ${paymentGatewayEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                      {paymentGatewayEnabled ? paymentSettingsCopy.enabled : paymentSettingsCopy.disabled}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{paymentSettingsCopy.links}</p>
                    <div className="mt-2 grid gap-3 xl:grid-cols-3">
                      {([
                        ["pro_monthly", paymentSettingsCopy.monthly],
                        ["pro_yearly", paymentSettingsCopy.yearly],
                        ["founding_member", paymentSettingsCopy.lifetime],
                      ] as Array<[PaymentPlanKey, string]>).map(([plan, label]) => (
                        <label key={plan} className="rounded-2xl border border-gray-150 bg-white p-3 text-[10px] font-bold text-gray-600">
                          {label}
                          <input
                            type="url"
                            value={paymentCheckoutUrls[plan]}
                            onChange={(event) => setPaymentCheckoutUrls((current) => ({ ...current, [plan]: event.target.value }))}
                            placeholder="https://eshipx.com/store/..."
                            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-surface-dark outline-none focus:border-brand"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{paymentSettingsCopy.names}</p>
                    <div className="mt-2 grid gap-3 xl:grid-cols-2">
                      {([
                        ["pro_yearly", paymentSettingsCopy.yearly],
                        ["founding_member", paymentSettingsCopy.lifetime],
                      ] as Array<[PaymentPlanKey, string]>).map(([plan, label]) => (
                        <div key={plan} className="rounded-2xl border border-gray-150 bg-white p-4">
                          <p className="text-xs font-extrabold text-surface-dark">{label}</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {(["en", "tr", "es", "zh"] as MaintenanceLanguage[]).map((language) => (
                              <label key={language} className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                {language}
                                <input
                                  required
                                  maxLength={80}
                                  value={localizedPlanNames[plan][language]}
                                  onChange={(event) => setLocalizedPlanNames((current) => ({
                                    ...current,
                                    [plan]: { ...current[plan], [language]: event.target.value },
                                  }))}
                                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-surface-dark outline-none focus:border-brand"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-gray-500">{paymentSettingsCopy.saveHint}</p>
                </div>

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
        {activeTab === "billing_operations" && canManageBilling && (
          <SubscriptionOperationsPanel language={adminLocale} profiles={profiles} />
        )}

        {activeTab === "promocodes" && canManagePromocodes && (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-surface-dark flex items-center gap-2">
                <Tag className="text-brand" size={18} /> {promoCopy.title}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {promoCopy.description}
              </p>
            </div>
            {promoLoadError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {adminLanguage === "tr" ? "Promosyon kullanım kayıtları yüklenemedi" : adminLanguage === "es" ? "No se pudieron cargar los canjes" : adminLanguage === "zh" ? "无法加载兑换记录" : "Promo redemption records could not be loaded"}: {promoLoadError}
              </div>
            )}

            {/* Create Promocode Form */}
            <form onSubmit={handleCreatePromocode} className="bg-gray-50/50 p-4 border border-gray-200/60 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-surface-dark flex items-center gap-1"><PlusCircle size={14} className="text-brand" /> {promoCopy.create}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.promoCode}</label>
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
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.type}</label>
                  <select
                    value={discountType}
                    onChange={(e) => {
                      const value = e.target.value as "percentage" | "free_trial" | "lifetime";
                      setDiscountType(value);
                      setDiscountValue(value === "free_trial" ? 3 : value === "percentage" ? 20 : 0);
                    }}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                  >
                    <option value="percentage">{promoCopy.percentage} (%)</option>
                    <option value="free_trial">{promoCopy.freeTrial}</option>
                    <option value="lifetime">{promoCopy.lifetime}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{discountType === "free_trial" ? promoCopy.trialDays : promoCopy.value}</label>
                  <input
                    type="number"
                    required
                    disabled={discountType === "lifetime"}
                    value={discountType === "lifetime" ? 0 : discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    min={discountType === "free_trial" ? 1 : 0}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.maxUses}</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder={promoCopy.unlimited}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.start}</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.end}</label>
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
                      <CheckCircle2 size={12} /> {promoCopy.created}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={creatingPromo}
                  className="px-4 py-2 bg-brand text-white text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  {creatingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag size={12} />}
                  {promoCopy.create}
                </button>
              </div>
            </form>

            {/* List Promocodes */}
            <div className="overflow-x-auto border border-gray-150 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-3">{promoCopy.code}</th>
                    <th className="px-5 py-3">{promoCopy.details}</th>
                    <th className="px-5 py-3">{promoCopy.usage}</th>
                    <th className="px-5 py-3">{promoCopy.dates}</th>
                    <th className="px-5 py-3">{promoCopy.status}</th>
                    <th className="px-5 py-3 text-right">{promoCopy.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs text-gray-700 bg-white">
                  {promocodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-gray-400">{promoCopy.noPromos}</td>
                    </tr>
                  ) : (
                    promocodes.map((promo) => {
                      const now = new Date();
                      const start = new Date(promo.start_date);
                      const end = new Date(promo.end_date);
                      const isExpired = now > end || now < start;
                      const recordedUsageCount = promoRedemptions.filter((redemption) => redemption.promocode_id === promo.id).length;
                      const reliableUsageCount = Math.max(Number(promo.uses_count) || 0, recordedUsageCount);
                      const hasUsageMismatch = recordedUsageCount !== Number(promo.uses_count || 0);
                      const limitReached = promo.max_uses !== null && reliableUsageCount >= promo.max_uses;

                      return (
                        <tr key={promo.id} className="hover:bg-gray-50/40">
                          <td className="px-5 py-3 font-bold text-surface-dark">{promo.code}</td>
                          <td className="px-5 py-3">
                            <span className="font-semibold text-xs">
                              {promo.discount_type === "lifetime" ? promoCopy.lifetime :
                               promo.discount_type === "free_trial" ? `${promo.discount_value} ${promoCopy.days} ${promoCopy.proTrial}` :
                               `${promo.discount_value}% ${promoCopy.percentage}`}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium">
                            <button
                              type="button"
                              onClick={() => setPromoRedemptionFilter(promo.id)}
                              className="font-bold text-brand hover:underline"
                            >
                              {reliableUsageCount} / {promo.max_uses !== null ? promo.max_uses : "∞"}
                            </button>
                            {hasUsageMismatch && <span className="ml-1 text-[9px] font-bold text-amber-600">DB ↔ log</span>}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {start.toLocaleDateString()} to {end.toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold">{promoCopy.expired}</span>
                            ) : limitReached ? (
                              <span className="px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold">{promoCopy.limitReached}</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-green-50 border border-green-100 text-green-600 text-[10px] font-bold">{promoCopy.active}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                             <div className="flex justify-end gap-2.5">
                               <button
                                 onClick={() => handleOpenEditPromo(promo)}
                                 className="p-1 hover:text-brand text-gray-400 transition-colors cursor-pointer"
                                 title={promoCopy.edit}
                               >
                                 <Edit size={14} />
                               </button>
                               <button
                                 onClick={() => handleDeletePromocode(promo.id)}
                                 className="p-1 hover:text-red-500 text-gray-400 transition-colors cursor-pointer"
                                 title={promoCopy.delete}
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

            <section className="overflow-hidden rounded-2xl border border-brand/10 bg-brand/[0.025]">
              <div className="flex flex-col gap-3 border-b border-brand/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-surface-dark">
                    <User size={15} className="text-brand" /> {promoCopy.redemptions}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">{promoCopy.redemptionHelp}</p>
                </div>
                <select
                  value={promoRedemptionFilter}
                  onChange={(event) => setPromoRedemptionFilter(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-surface-dark outline-none"
                >
                  <option value="all">{promoCopy.allCodes}</option>
                  {promocodes.map((promo) => <option key={promo.id} value={promo.id}>{promo.code}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-xs">
                  <thead className="bg-white/70 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-5 py-3">{promoCopy.code}</th>
                      <th className="px-5 py-3">{promoCopy.user}</th>
                      <th className="px-5 py-3">{promoCopy.benefit}</th>
                      <th className="px-5 py-3">{promoCopy.trialPeriod}</th>
                      <th className="px-5 py-3">{promoCopy.redeemed}</th>
                      <th className="px-5 py-3 text-right">{promoCopy.manage}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {visiblePromoRedemptions.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">{promoCopy.noRedemptions}</td></tr>
                    ) : visiblePromoRedemptions.map((redemption) => {
                      const trialStart = redemption.trial_started_at ? new Date(redemption.trial_started_at) : null;
                      const trialEnd = redemption.trial_ends_at ? new Date(redemption.trial_ends_at) : null;
                      const actualTrialDays = trialStart && trialEnd
                        ? Math.round((trialEnd.getTime() - trialStart.getTime()) / 86_400_000)
                        : null;
                      const hasDurationMismatch = redemption.discount_type === "free_trial"
                        && actualTrialDays !== null
                        && actualTrialDays !== Number(redemption.granted_value);
                      return (
                        <tr key={redemption.id} className="hover:bg-brand/[0.025]">
                          <td className="px-5 py-3 font-extrabold text-brand">{redemption.code}</td>
                          <td className="px-5 py-3">
                            <span className="block font-bold text-surface-dark">{redemption.full_name}</span>
                            <span className="text-[10px] text-gray-400">{redemption.email}</span>
                          </td>
                          <td className="px-5 py-3 font-semibold text-gray-600">
                            {redemption.discount_type === "free_trial"
                              ? `${redemption.granted_value} ${promoCopy.days} ${promoCopy.proTrial}`
                              : redemption.discount_type === "lifetime"
                                ? promoCopy.lifetime
                                : `${redemption.granted_value}% ${promoCopy.percentage}`}
                              {hasDurationMismatch && (
                                <span className="mt-1 block rounded-md bg-red-50 px-1.5 py-1 text-[9px] font-extrabold text-red-700">
                                  {durationMismatchLabel}: {redemption.granted_value} / {actualTrialDays}
                                </span>
                              )}
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {trialStart && trialEnd
                              ? `${trialStart.toLocaleString(adminDateLocale)} → ${trialEnd.toLocaleString(adminDateLocale)}`
                              : "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-500">{new Date(redemption.redeemed_at).toLocaleString(adminDateLocale)}</td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustAccess(
                                profiles.find((profile) => profile.id === redemption.user_id) || {
                                  id: redemption.user_id,
                                  full_name: redemption.full_name,
                                  email: redemption.email,
                                  plan: redemption.plan,
                                  subscription_status: redemption.subscription_status,
                                  trial_start_at: redemption.trial_started_at,
                                  trial_ends_at: redemption.trial_ends_at,
                                }
                              )}
                              className="inline-flex items-center gap-1 rounded-lg border border-brand/15 bg-brand/5 px-2.5 py-1.5 text-[10px] font-bold text-brand hover:bg-brand/10"
                            >
                              <Clock size={11} /> {promoCopy.manage}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Users Table */}
        {activeTab === "users" && canManageUsers && (
          <div className="space-y-4">
            {canManageBilling && <BulkAccessControls language={adminLocale} onComplete={fetchProfiles} />}
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-base font-bold text-surface-dark">{adminText.registered}</h2>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-brand" />}
            </div>

            <div className="grid gap-3 p-3 sm:p-4 lg:hidden">
              {profiles.length === 0 && <p className="py-8 text-center text-sm text-gray-400">{adminText.emptyUsers}</p>}
              {profiles.map((profile) => {
                const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
                const isTrialActive = Boolean(trialEnd && trialEnd > new Date());
                const trialDays = isTrialActive && trialEnd ? Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000)) : 0;
                const planLabel = isTrialActive
                  ? `${trialDays} ${promoCopy.days} ${promoCopy.proTrial}`
                  : profile.plan === "founding" ? adminText.founding
                    : profile.plan === "pro" ? promoCopy.proTier : promoCopy.freeTier;
                return (
                  <article key={profile.id} className="rounded-2xl border border-gray-150 bg-white p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><h3 className="truncate text-sm font-extrabold text-surface-dark">{profile.full_name || adminText.anonymous}</h3><p className="mt-0.5 break-all text-[11px] text-gray-400">{profile.email}</p></div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${profile.plan === "pro" || profile.plan === "founding" || isTrialActive ? "bg-brand/10 text-brand" : "bg-gray-100 text-gray-600"}`}>{planLabel}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div><dt className="font-bold text-gray-400">{adminText.grade}</dt><dd className="mt-1 font-semibold text-gray-700">{profile.grade_level || adminText.unspecified}</dd></div>
                      <div><dt className="font-bold text-gray-400">{adminText.role}</dt><dd className="mt-1 font-semibold text-gray-700">{profile.role === "super_admin" ? "Super Admin" : profile.role === "admin" ? adminText.subAdmin : adminText.student}</dd></div>
                      <div className="col-span-2"><dt className="font-bold text-gray-400">{adminText.expiration}</dt><dd className="mt-1 font-semibold text-gray-700">{trialEnd ? trialEnd.toLocaleString(adminDateLocale) : profile.billing_cycle === "lifetime" || profile.plan === "founding" ? adminText.lifetime : adminText.freeActive}</dd></div>
                    </dl>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button disabled={updatingId !== null} onClick={() => handleOpenAdjustAccess(profile)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-bold text-gray-700"><CreditCard size={13} />{adminText.setPlan}</button>
                      <button disabled={updatingId !== null} onClick={() => handleOpenBillingDetails(profile)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-bold text-gray-700"><Clock size={13} />{adminText.history}</button>
                      <button disabled={updatingId !== null} onClick={() => handleOpenEditStudent(profile)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-bold text-gray-700"><Edit size={13} />{adminText.editProfile}</button>
                      {isSuperAdmin && <button disabled={updatingId !== null} onClick={() => handleOpenEditUser(profile)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-bold text-gray-700"><UserCog size={13} />{adminText.editRole}</button>}
                      {profile.plan !== "free" && <button disabled={updatingId !== null} onClick={() => handleCancelUserSubscription(profile.id, profile.full_name || profile.email || "User")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-bold text-red-700"><X size={13} />{adminText.cancelSub}</button>}
                      <button disabled={updatingId !== null} onClick={() => handleDeleteStudent(profile.id, profile.full_name)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50/40 px-3 py-2.5 text-[11px] font-bold text-red-600"><Trash2 size={13} />{adminText.deleteUser}</button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1120px] text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-100">
                    <th className="px-5 py-4">{adminText.name}</th>
                    <th className="px-5 py-4">{adminText.grade}</th>
                    <th className="px-5 py-4">{adminText.subscription}</th>
                    <th className="px-5 py-4">{adminText.expiration}</th>
                    <th className="px-5 py-4">{adminText.role}</th>
                    <th className="px-5 py-4 text-right">{adminText.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        {adminText.emptyUsers}
                      </td>
                    </tr>
                  )}
                  {profiles.map((profile) => {
                    const isUserPro = profile.plan === "pro";
                    const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
                    const isTrialActive = Boolean(trialEnd && trialEnd > new Date());
                    const isExpired = Boolean(trialEnd && trialEnd <= new Date());
                    const trialDays = isTrialActive && trialEnd
                      ? Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000))
                      : 0;
                    
                    return (
                      <tr key={profile.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-surface-dark">
                            {profile.full_name || adminText.anonymous}
                          </div>
                          {profile.email && (
                            <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                              {profile.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {profile.grade_level || adminText.unspecified}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isTrialActive || (isUserPro && !isExpired) ? "bg-brand/10 text-brand" : "bg-gray-100 text-gray-600"}`}>
                            {isTrialActive ? (
                              <>
                                <Clock size={12} /> {trialDays} {promoCopy.days} {promoCopy.proTrial}
                              </>
                            ) : isUserPro && !isExpired ? (
                              <>
                                <Sparkles size={12} /> {promoCopy.proTier}
                              </>
                            ) : profile.plan === "founding" ? (
                              <>
                                <Sparkles size={12} className="text-purple-500 animate-pulse" /> {adminText.founding}
                              </>
                            ) : (
                              promoCopy.freeTier
                            )}
                          </span>
                          {profile.discount_percent > 0 && (
                            <span className="ml-2 text-[10px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-200">
                              -{profile.discount_percent}% Coupon
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {isTrialActive ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-brand">{trialDays} {promoCopy.days} {promoCopy.proTrial}</span>
                              <span className="block text-[10px] text-gray-400">{promoCopy.expires}: {trialEnd?.toLocaleString(adminDateLocale)}</span>
                              {profile.active_promocode && <span className="block text-[10px] font-semibold text-purple-500">{profile.active_promocode}</span>}
                            </div>
                          ) : isUserPro && !isExpired ? (
                            profile.billing_cycle === "monthly" ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Clock size={11} className="text-brand" /> {adminText.monthly}</span>
                                {profile.next_billing_date && <span className="block text-[10px] text-gray-400">{adminText.renews}: {new Date(profile.next_billing_date).toLocaleDateString(adminDateLocale)}</span>}
                              </div>
                            ) : profile.billing_cycle === "yearly" ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Clock size={11} className="text-brand" /> {adminText.yearly}</span>
                                {profile.next_billing_date && <span className="block text-[10px] text-gray-400">{adminText.renews}: {new Date(profile.next_billing_date).toLocaleDateString(adminDateLocale)}</span>}
                              </div>
                            ) : profile.billing_cycle === "lifetime" || !profile.trial_ends_at ? (
                              <span className="font-semibold text-purple-650">{adminText.lifetime}</span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-brand font-semibold">{adminText.proTrial}</span>
                                <span className="block text-[10px] text-gray-400">{promoCopy.expires}: {new Date(profile.trial_ends_at).toLocaleDateString(adminDateLocale)}</span>
                              </div>
                            )
                          ) : profile.plan === "founding" ? (
                            <span className="font-semibold text-purple-650">{adminText.lifetime}</span>
                          ) : isExpired ? (
                            <span className="text-red-500 font-bold">{promoCopy.trialExpired}</span>
                          ) : (
                            adminText.freeActive
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
                            {profile.role === "super_admin" ? "Super Admin" : profile.role === "admin" ? adminText.subAdmin : adminText.student}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenAdjustAccess(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <CreditCard size={12} /> {adminText.setPlan}
                            </button>
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenBillingDetails(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Clock size={12} /> {adminText.history}
                            </button>
                            {profile.plan !== "free" && (
                              <button
                                disabled={updatingId !== null}
                                onClick={() => handleCancelUserSubscription(profile.id, profile.full_name || profile.email || "User")}
                                className="px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                title="Cancel subscription and set plan to Free"
                              >
                                <X size={12} /> {adminText.cancelSub}
                              </button>
                            )}
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleOpenEditStudent(profile)}
                              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Edit size={12} /> {adminText.editProfile}
                            </button>
                            {isSuperAdmin && (
                              <button
                                disabled={updatingId !== null}
                                onClick={() => handleOpenEditUser(profile)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <UserCog size={12} /> {adminText.editRole}
                              </button>
                            )}
                            <button
                              disabled={updatingId !== null}
                              onClick={() => handleDeleteStudent(profile.id, profile.full_name)}
                              className="px-2.5 py-1.5 rounded-lg border border-red-100 text-xs font-bold text-red-600 bg-red-50/30 hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Trash2 size={12} /> {adminText.deleteUser}
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
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Plan filter</label>
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
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Language filter</label>
                    <select
                      value={emailTargetLanguage}
                      onChange={(event) => setEmailTargetLanguage(event.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none"
                    >
                      <option value="all">All languages</option>
                      <option value="en">English</option>
                      <option value="tr">Türkçe</option>
                      <option value="es">Español</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade filter</label>
                    <select
                      value={emailTargetGrade}
                      onChange={(event) => setEmailTargetGrade(event.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none"
                    >
                      <option value="all">All grades</option>
                      {[...new Set(
                        profiles
                          .map((profile) => profile.grade_level)
                          .filter((grade): grade is string => Boolean(grade))
                      )]
                        .sort()
                        .map((grade) => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role filter</label>
                    <select
                      value={emailTargetRole}
                      onChange={(event) => setEmailTargetRole(event.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none"
                    >
                      <option value="all">All roles</option>
                      <option value="student">Students</option>
                      <option value="admin">Admins</option>
                      <option value="super_admin">Super admins</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select individual users (optional)</label>
                      <p className="mt-1 text-[10px] text-gray-400">Leave empty to use the filters above.</p>
                    </div>
                    {emailSelectedUserIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setEmailSelectedUserIds([])}
                        className="text-[10px] font-bold text-red-500"
                      >
                        Clear {emailSelectedUserIds.length}
                      </button>
                    )}
                  </div>
                  <input
                    type="search"
                    value={emailUserSearch}
                    onChange={(event) => setEmailUserSearch(event.target.value)}
                    placeholder="Filter by email or name..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs text-surface-dark outline-none focus:ring-1 focus:ring-brand"
                  />
                  {emailUserSearch.trim() && (
                    <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl bg-gray-50 p-2">
                      {profiles
                        .filter((profile) => {
                          const query = emailUserSearch.trim().toLowerCase();
                          return (
                            profile.email?.toLowerCase().includes(query) ||
                            profile.full_name?.toLowerCase().includes(query)
                          );
                        })
                        .slice(0, 50)
                        .map((profile) => (
                          <label
                            key={profile.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] text-gray-600"
                          >
                            <input
                              type="checkbox"
                              checked={emailSelectedUserIds.includes(profile.id)}
                              onChange={(event) =>
                                setEmailSelectedUserIds((current) =>
                                  event.target.checked
                                    ? [...current, profile.id]
                                    : current.filter((id) => id !== profile.id)
                                )
                              }
                              className="accent-brand"
                            />
                            <span className="font-bold text-surface-dark">
                              {profile.full_name || "Unnamed"}
                            </span>
                            <span className="truncate text-gray-400">{profile.email}</span>
                          </label>
                        ))}
                    </div>
                  )}
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

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-indigo-900">Clickable email action</h3>
                    <p className="mt-1 text-[10px] text-indigo-700">
                      URLs typed in the message body become clickable automatically. You can also add one prominent action button.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      ["EN", emailCtaLabel, setEmailCtaLabel],
                      ["TR", emailCtaLabelTR, setEmailCtaLabelTR],
                      ["ES", emailCtaLabelES, setEmailCtaLabelES],
                      ["ZH", emailCtaLabelZH, setEmailCtaLabelZH],
                    ].map(([code, value, setter]) => (
                      <input
                        key={code as string}
                        type="text"
                        value={value as string}
                        onChange={(event) =>
                          (setter as React.Dispatch<React.SetStateAction<string>>)(
                            event.target.value
                          )
                        }
                        placeholder={`${code} button label`}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-surface-dark outline-none"
                      />
                    ))}
                  </div>
                  <input
                    type="url"
                    value={emailCtaUrl}
                    onChange={(event) => setEmailCtaUrl(event.target.value)}
                    disabled={emailRewardEnabled}
                    placeholder="https://onpace-ai.xyz/..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-surface-dark outline-none disabled:bg-gray-100"
                  />
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={emailRewardEnabled}
                      onChange={(event) => setEmailRewardEnabled(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-emerald-600"
                    />
                    <span>
                      <span className="block text-xs font-extrabold text-emerald-900">
                        Add a one-click plan reward
                      </span>
                      <span className="mt-1 block text-[10px] leading-4 text-emerald-700">
                        Each matched user can activate the reward once. Forwarding the link does not grant access to users outside this recipient list.
                      </span>
                    </span>
                  </label>
                  {emailRewardEnabled && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <select
                        value={emailRewardPlan}
                        onChange={(event) => setEmailRewardPlan(event.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-surface-dark"
                      >
                        <option value="pro">Pro plan</option>
                        <option value="plus">Plus plan</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={emailRewardDays}
                        onChange={(event) => setEmailRewardDays(event.target.value)}
                        placeholder="Reward days"
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-surface-dark"
                      />
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={emailRewardValidDays}
                        onChange={(event) => setEmailRewardValidDays(event.target.value)}
                        placeholder="Link valid days"
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-surface-dark"
                      />
                    </div>
                  )}
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

        {/* Student course selections audit */}
        {activeTab === "courses" && canManageUsers && (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-3xl border border-gray-150 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-extrabold text-surface-dark">
                  <BookOpen className="text-brand" size={20} /> Student Course Selections
                </h2>
                <p className="mt-1 text-xs text-gray-400">Catalog, country-exam recommendations, and explicitly added custom courses.</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={courseSearch}
                  onChange={(event) => setCourseSearch(event.target.value)}
                  placeholder="Search student or course"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-surface-dark outline-none focus:border-brand"
                />
                <button onClick={fetchCourseSelections} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200">
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {loadingCourses ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-150 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Country</th>
                        <th className="px-5 py-3">Course</th>
                        <th className="px-5 py-3">Source</th>
                        <th className="px-5 py-3">Selected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {courseSelections
                        .filter((row) => {
                          const query = courseSearch.trim().toLocaleLowerCase();
                          return !query || [row.student_name, row.student_email, row.course_name, row.country]
                            .some((value) => String(value || "").toLocaleLowerCase().includes(query));
                        })
                        .map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50/70">
                            <td className="px-5 py-4">
                              <p className="font-bold text-surface-dark">{row.student_name}</p>
                              <p className="mt-0.5 text-[10px] text-gray-400">{row.student_email}</p>
                            </td>
                            <td className="px-5 py-4 font-semibold text-gray-600"><span className="inline-flex items-center gap-1"><MapPin size={12} /> {row.country || "—"}</span></td>
                            <td className="px-5 py-4 font-bold text-surface-dark">{row.course_name}</td>
                            <td className="px-5 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase ${
                                row.course_source === "custom" ? "bg-amber-50 text-amber-700" : row.course_source === "exam_suggestion" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                              }`}>
                                {row.course_source === "exam_suggestion" ? "Country exam" : row.course_source || "custom"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-gray-400">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {courseSelections.length === 0 && <p className="p-10 text-center text-xs text-gray-400">No course selections yet.</p>}
              </div>
            )}
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
                        <div className="font-mono text-[11px] font-extrabold tracking-wide text-brand">
                          {formatBugReportTrackingNumber(bug.id)}
                        </div>
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
            <div className="max-h-[92vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-3xl border border-gray-150 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-surface-dark flex items-center gap-2">
                    <Sparkles className="text-brand animate-pulse" /> {promoCopy.adjustTitle}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{promoCopy.forStudent}: {selectedUser.full_name || selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.targetTier}</label>
                  <select
                    value={trialDuration}
                    onChange={(e) => handleTrialDurationChange(e.target.value)}
                    className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                  >
                    <option value="free">{promoCopy.freeTier}</option>
                    <option value="7">7 {promoCopy.days} {promoCopy.proTrial}</option>
                    <option value="30">30 {promoCopy.days} {promoCopy.proTrial}</option>
                    <option value="custom">{promoCopy.customTrial}</option>
                    <option value="lifetime">{promoCopy.lifetime}</option>
                  </select>
                </div>

                {trialDuration === "custom" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.trialDays}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={3650}
                      value={customTrialDays}
                      onChange={(e) => handleCustomTrialDaysChange(e.target.value)}
                      placeholder="e.g. 14"
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold"
                    />
                  </div>
                )}

                {trialDuration !== "free" && trialDuration !== "lifetime" && (
                  <div className="space-y-3 rounded-2xl border border-brand/10 bg-brand/[0.025] p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">{promoCopy.exactStart}</label>
                        <input
                          type="datetime-local"
                          value={adjustTrialStart}
                          onChange={(event) => setAdjustTrialStart(event.target.value)}
                          className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-surface-dark outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">{promoCopy.exactEnd}</label>
                        <input
                          type="datetime-local"
                          value={adjustTrialEnd}
                          onChange={(event) => setAdjustTrialEnd(event.target.value)}
                          className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-surface-dark outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">{promoCopy.extraDays}</label>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={extraTrialDays}
                          onChange={(event) => setExtraTrialDays(event.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-surface-dark outline-none focus:ring-1 focus:ring-brand"
                        />
                        <button type="button" onClick={handleAddTrialDays} className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-xs font-bold text-brand hover:bg-brand/10">
                          <PlusCircle size={13} className="mr-1 inline" /> {promoCopy.addDays}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.graceDays}</label>
                    <input
                      type="number"
                      min={0}
                      value={adjustGraceDays}
                      onChange={(e) => setAdjustGraceDays(Number(e.target.value))}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.failedRetries}</label>
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
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.nextBilling}</label>
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
                    {promoCopy.cancel}
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
                        { key: "manage_billing", label: "Payments, Subscriptions & Bulk Plan Operations" },
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
                    {promoCopy.save}
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
                    <Tag className="text-brand" /> {promoCopy.edit} · {editingPromo.code}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{promoCopy.description}</p>
                </div>
                <button onClick={() => setEditingPromo(null)} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.promoCode}</label>
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
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.type}</label>
                    <select
                      value={editingPromoDiscountType}
                      onChange={(e) => setEditingPromoDiscountType(e.target.value as "percentage" | "free_trial" | "lifetime")}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-surface-dark outline-none cursor-pointer font-semibold"
                    >
                      <option value="percentage">{promoCopy.percentage}</option>
                      <option value="free_trial">{promoCopy.freeTrial}</option>
                      <option value="lifetime">{promoCopy.lifetime}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{editingPromoDiscountType === "free_trial" ? promoCopy.trialDays : promoCopy.value}</label>
                    <input
                      type="number"
                      required
                      min={editingPromoDiscountType === "free_trial" ? 1 : 0}
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
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.maxUses}</label>
                    <input
                      type="number"
                      value={editingPromoMaxUses}
                      onChange={(e) => setEditingPromoMaxUses(e.target.value)}
                      placeholder={promoCopy.unlimited}
                      className="block w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.start}</label>
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
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{promoCopy.end}</label>
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
                    {promoCopy.cancel}
                  </button>
                  <button
                    onClick={handleSavePromoCode}
                    disabled={savingPromo}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-hover cursor-pointer flex items-center justify-center gap-1"
                  >
                    {savingPromo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {promoCopy.save}
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
