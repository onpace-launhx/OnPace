"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Gift, Loader2, MailCheck, ReceiptText, RefreshCw, Search, Settings2, ShieldCheck, UserPlus, UsersRound, XCircle } from "lucide-react";
import { PaymentCatalogSettings } from "@/components/admin/PaymentCatalogSettings";

type Language = "en" | "tr" | "es" | "zh";
type Profile = { id: string; full_name?: string | null; email?: string | null; language?: string | null; plan?: string | null };
type Subscription = {
  id: string; user_id: string; plan: string; provider: string; provider_reference?: string | null;
  amount: number; currency: string; billing_cycle: string; status: string; period_start: string;
  period_end?: string | null; next_renewal_at?: string | null; trial_days?: number | null; created_at: string;
  profiles?: { full_name?: string | null; email?: string | null; language?: string | null } | null;
};
type PaymentClaim = {
  id: string; user_id: string; plan_type: string; plan: string; billing_cycle: string;
  payer_email: string; quoted_amount: number; currency: string; status: string;
  provider_reference?: string | null; customer_note?: string | null; admin_note?: string | null;
  submitted_at: string; reviewed_at?: string | null;
  profiles?: { full_name?: string | null; email?: string | null; language?: string | null; plan?: string | null } | null;
};
type Campaign = { id: string; ends_at: string; source_local_end: string; auto_assign_new_users: boolean; target_filter?: { plan?: string }; status: string; created_at: string };
type CancellationRequest = { id: string; status: string; requested_at: string; profiles?: { full_name?: string | null; email?: string | null } | null; manual_subscriptions?: { plan?: string; billing_cycle?: string; provider_reference?: string | null } | null };
type PurchaseRecord = { id: string; created_at: string; plan_type: string; billing_cycle: string; amount: number; currency: string; provider_reference?: string | null; profiles?: { full_name?: string | null; email?: string | null } | null };
type ReviewDraft = { reference: string; amount: string; currency: string; note: string };
type BulkPreview = { operationId: string; previewCount: number; previewToken: string; confirmationText: string; endsAtUtc?: string | null };
type PanelTab = "payments" | "activate" | "subscriptions" | "campaigns" | "catalog";

const NAV_COPY = {
  en: { payments: "Payment requests", activate: "Activate membership", subscriptions: "Subscriptions", campaigns: "Bulk access", catalog: "EshipX settings", pending: "Pending matches", active: "Active records", protected: "Learning data protected" },
  tr: { payments: "Ödeme bildirimleri", activate: "Üyelik başlat", subscriptions: "Abonelikler", campaigns: "Toplu erişim", catalog: "eShipX ayarları", pending: "Bekleyen eşleşme", active: "Aktif kayıt", protected: "Öğrenme verileri korunur" },
  es: { payments: "Avisos de pago", activate: "Activar membresía", subscriptions: "Suscripciones", campaigns: "Acceso masivo", catalog: "Ajustes EshipX", pending: "Vinculaciones pendientes", active: "Registros activos", protected: "Datos de estudio protegidos" },
  zh: { payments: "付款通知", activate: "开通会员", subscriptions: "订阅记录", campaigns: "批量访问", catalog: "EshipX 设置", pending: "待匹配", active: "有效记录", protected: "学习数据受保护" },
} as const;

const COPY = {
  en: {
    title: "Payment & subscription operations", subtitle: "Activate a membership directly after recording a verified payment. No activation code is generated.",
    direct: "Direct membership activation", user: "User", choose: "Choose a user", plan: "Plan", pro: "Pro", founding: "Founding membership", amount: "Amount", currency: "Currency", cycle: "Billing cycle", monthly: "Monthly", yearly: "Yearly", oneTime: "One-time",
    reference: "EshipX payment reference", referenceHelp: "Required for every paid membership, including packages that begin with a free trial.", note: "Internal note", trialDays: "Optional free trial days", trialHelp: "Use 0 for no trial. Example: 3 days free + monthly billing.", create: "Save and activate membership", creating: "Activating…", activated: "Membership activated and saved.",
    records: "Subscription records", refresh: "Refresh", empty: "No manual subscription records yet.", renew: "Renew", cancelEnd: "Cancel at period end", cancelNow: "Cancel now", next: "Next", status: "Status",
    bulk: "Bulk package management", bulkHelp: "Only subscription fields change. Notes, tasks, calendar, chats, courses, and study history are never deleted.", operation: "Bulk operation", reset: "Reset package information", grant: "Grant complimentary Pro", target: "Target accounts", allStudents: "All students", preview: "Preview safely", affected: "accounts will be affected", confirmation: "Type the exact confirmation text", executeReset: "Reset selected packages", executeGrant: "Grant complimentary access", completedReset: "Package reset completed", completedGrant: "Complimentary access granted", resetWarning: "Matched accounts move to Free and their active manual subscriptions are canceled.", grantWarning: "Matched accounts receive Pro until one exact global expiry time. No payment is collected.", easternEnd: "End in US Eastern Time (EST/EDT)", easternHelp: "Daylight saving is handled automatically. The preview shows the exact UTC and your local equivalent.", autoAssign: "Automatically grant this package to new users who register before it ends", utcEnd: "Exact UTC end", localEnd: "Your local equivalent", activeCampaigns: "Recent complimentary campaigns", campaignAuto: "New-user assignment on", campaignManual: "Existing users only",
    error: "The operation could not be completed.", confirmCancel: "Confirm this subscription action?", emailNotice: "Activation, renewal, cancellation, reset, and complimentary access emails are sent in each user's saved language.",
    queue: "EshipX payment matching queue", queueHelp: "Match the OnPace account with the payer's EshipX email and unique transaction reference.", search: "Search name, OnPace email, EshipX email, or reference", allStatuses: "All statuses", submitted: "Awaiting review", reviewing: "Reviewing", approved: "Activated", rejected: "Rejected", canceled: "Canceled", onpaceAccount: "OnPace account", payerAccount: "EshipX payer email", submittedAt: "Submitted", approve: "Match and activate", reject: "Reject notice", reviewNote: "Internal review note", noClaims: "No payment notices match these filters.", referenceRequired: "A unique EshipX reference is required for this action.", activationWarning: "This immediately grants paid access and emails the user.", renewalWarning: "Confirm the renewal payment belongs to this user.", approvedSuccess: "Payment matched and subscription activated.", rejectedSuccess: "Payment notice rejected and the user was informed.", renewedSuccess: "Payment recorded and subscription renewed.", cancelledSuccess: "Subscription cancellation saved.", emailDeliveryWarning: "The operation succeeded, but its service email was not sent. Check Resend and the event log.", publishPending: "The subscription service must be included in the final Supabase release before these controls can be used.",
  },
  tr: {
    title: "Ödeme ve abonelik işlemleri", subtitle: "Doğrulanmış ödemeyi kaydettikten sonra üyeliği doğrudan başlatın. Aktivasyon kodu üretilmez.",
    direct: "Doğrudan üyelik aktivasyonu", user: "Kullanıcı", choose: "Kullanıcı seçin", plan: "Paket", pro: "Pro", founding: "Kurucu üyelik", amount: "Tutar", currency: "Para birimi", cycle: "Ödeme sıklığı", monthly: "Aylık", yearly: "Yıllık", oneTime: "Tek seferlik",
    reference: "EshipX ödeme referansı", referenceHelp: "Ücretsiz denemeyle başlayanlar dahil her ücretli üyelikte zorunludur.", note: "Yalnızca yöneticilerin göreceği not", trialDays: "Opsiyonel ücretsiz deneme günü", trialHelp: "Deneme yoksa 0 girin. Örnek: 3 gün ücretsiz + aylık paket.", create: "Kaydet ve üyeliği başlat", creating: "Aktifleştiriliyor…", activated: "Üyelik kaydedildi ve aktif edildi.",
    records: "Abonelik kayıtları", refresh: "Yenile", empty: "Henüz manuel abonelik kaydı yok.", renew: "Yenile", cancelEnd: "Dönem sonunda iptal", cancelNow: "Hemen iptal", next: "Sonraki", status: "Durum",
    bulk: "Toplu paket yönetimi", bulkHelp: "Yalnızca abonelik alanları değişir. Notlar, görevler, takvim, sohbetler, dersler ve çalışma geçmişi asla silinmez.", operation: "Toplu işlem", reset: "Paket bilgilerini sıfırla", grant: "Ücretsiz Pro tanımla", target: "Hedef hesaplar", allStudents: "Tüm öğrenciler", preview: "Güvenli önizleme", affected: "hesap etkilenecek", confirmation: "Onay metnini birebir yazın", executeReset: "Seçili paketleri sıfırla", executeGrant: "Ücretsiz erişimi tanımla", completedReset: "Paket sıfırlama tamamlandı", completedGrant: "Ücretsiz erişim tanımlandı", resetWarning: "Eşleşen hesaplar Ücretsiz pakete geçirilir ve aktif manuel abonelikleri iptal edilir.", grantWarning: "Eşleşen hesaplara dünya genelinde aynı anda bitecek Pro erişimi verilir. Ücret alınmaz.", easternEnd: "ABD Doğu Saatine göre bitiş (EST/EDT)", easternHelp: "Yaz/kış saati otomatik hesaplanır. Önizlemede kesin UTC ve sizin yerel saatiniz gösterilir.", autoAssign: "Kampanya bitene kadar yeni kayıt olan kullanıcılara bu paketi otomatik tanımla", utcEnd: "Kesin UTC bitişi", localEnd: "Sizin yerel saatiniz", activeCampaigns: "Son ücretsiz erişim kampanyaları", campaignAuto: "Yeni üyelere otomatik", campaignManual: "Yalnızca mevcut kullanıcılar",
    error: "İşlem tamamlanamadı.", confirmCancel: "Bu abonelik işlemini onaylıyor musunuz?", emailNotice: "Aktivasyon, yenileme, iptal, sıfırlama ve ücretsiz erişim e-postaları kullanıcının kayıtlı dilinde gönderilir.",
    queue: "eShipX ödeme eşleştirme kuyruğu", queueHelp: "OnPace hesabını ödeme yapan eShipX e-postası ve benzersiz işlem referansıyla eşleştirin.", search: "Ad, OnPace e-postası, eShipX e-postası veya referans ara", allStatuses: "Tüm durumlar", submitted: "Kontrol bekliyor", reviewing: "İnceleniyor", approved: "Aktif edildi", rejected: "Reddedildi", canceled: "İptal edildi", onpaceAccount: "OnPace hesabı", payerAccount: "eShipX ödeme e-postası", submittedAt: "Gönderilme", approve: "Eşleştir ve aktif et", reject: "Bildirimi reddet", reviewNote: "Yönetici inceleme notu", noClaims: "Bu filtrelerle eşleşen ödeme bildirimi yok.", referenceRequired: "Bu işlem için benzersiz EshipX referansı zorunludur.", activationWarning: "Bu işlem ücretli erişimi hemen açar ve kullanıcıya e-posta gönderir.", renewalWarning: "Yenileme ödemesinin bu kullanıcıya ait olduğunu doğrulayın.", approvedSuccess: "Ödeme eşleştirildi ve abonelik aktif edildi.", rejectedSuccess: "Ödeme bildirimi reddedildi ve kullanıcı bilgilendirildi.", renewedSuccess: "Ödeme kaydedildi ve abonelik yenilendi.", cancelledSuccess: "Abonelik iptal işlemi kaydedildi.", emailDeliveryWarning: "İşlem tamamlandı ancak servis e-postası gönderilemedi. Resend ayarını ve olay kaydını kontrol edin.", publishPending: "Bu kontrolleri kullanmadan önce abonelik servisinin toplu Supabase yayınında yayınlanması gerekiyor.",
  },
  es: {
    title: "Operaciones de pago y suscripción", subtitle: "Activa la membresía directamente después de registrar un pago verificado. No se genera ningún código.",
    direct: "Activación directa", user: "Usuario", choose: "Elegir usuario", plan: "Plan", pro: "Pro", founding: "Membresía fundadora", amount: "Importe", currency: "Moneda", cycle: "Ciclo", monthly: "Mensual", yearly: "Anual", oneTime: "Pago único",
    reference: "Referencia de pago EshipX", referenceHelp: "Obligatoria para toda membresía de pago, incluso si comienza con una prueba gratuita.", note: "Nota interna", trialDays: "Días de prueba opcionales", trialHelp: "Usa 0 si no hay prueba. Ejemplo: 3 días gratis + plan mensual.", create: "Guardar y activar", creating: "Activando…", activated: "Membresía guardada y activada.",
    records: "Suscripciones", refresh: "Actualizar", empty: "Aún no hay suscripciones manuales.", renew: "Renovar", cancelEnd: "Cancelar al final", cancelNow: "Cancelar ahora", next: "Próxima", status: "Estado",
    bulk: "Gestión masiva de planes", bulkHelp: "Solo cambian los campos de suscripción. Nunca se eliminan notas, tareas, calendario, chats, cursos ni historial.", operation: "Operación masiva", reset: "Restablecer planes", grant: "Conceder Pro gratuito", target: "Cuentas objetivo", allStudents: "Todos los estudiantes", preview: "Vista previa segura", affected: "cuentas afectadas", confirmation: "Escribe el texto exacto", executeReset: "Restablecer planes", executeGrant: "Conceder acceso gratuito", completedReset: "Restablecimiento completado", completedGrant: "Acceso gratuito concedido", resetWarning: "Las cuentas pasan al plan Gratuito y se cancelan suscripciones manuales activas.", grantWarning: "Las cuentas reciben Pro hasta un único instante global. No se cobra nada.", easternEnd: "Fin en hora del Este de EE. UU. (EST/EDT)", easternHelp: "El horario de verano se calcula automáticamente. La vista previa muestra UTC y tu hora local.", autoAssign: "Asignar automáticamente a nuevos usuarios que se registren antes del fin", utcEnd: "Fin UTC exacto", localEnd: "Equivalente en tu zona", activeCampaigns: "Campañas gratuitas recientes", campaignAuto: "Automático para nuevos usuarios", campaignManual: "Solo usuarios actuales",
    error: "No se pudo completar la operación.", confirmCancel: "¿Confirmas esta operación?", emailNotice: "Los correos se envían en el idioma guardado de cada usuario.",
    queue: "Cola de pagos EshipX", queueHelp: "Vincula la cuenta de OnPace con el correo EshipX y la referencia única.", search: "Buscar nombre, correo o referencia", allStatuses: "Todos los estados", submitted: "Pendiente", reviewing: "En revisión", approved: "Activado", rejected: "Rechazado", canceled: "Cancelado", onpaceAccount: "Cuenta OnPace", payerAccount: "Correo EshipX", submittedAt: "Enviado", approve: "Vincular y activar", reject: "Rechazar", reviewNote: "Nota interna", noClaims: "No hay avisos coincidentes.", referenceRequired: "Se requiere una referencia EshipX única.", activationWarning: "Esto activa el acceso inmediatamente y envía un correo.", renewalWarning: "Confirma que el pago pertenece a este usuario.", approvedSuccess: "Pago vinculado y suscripción activada.", rejectedSuccess: "Aviso rechazado y usuario informado.", renewedSuccess: "Pago registrado y suscripción renovada.", cancelledSuccess: "Cancelación guardada.", emailDeliveryWarning: "La operación terminó, pero no se envió el correo. Revisa Resend y el registro.", publishPending: "El servicio de suscripciones debe publicarse en la versión final de Supabase antes de usar estos controles.",
  },
  zh: {
    title: "付款与订阅操作", subtitle: "记录已核实付款后直接开通会员，不再生成激活码。",
    direct: "直接开通会员", user: "用户", choose: "选择用户", plan: "套餐", pro: "Pro", founding: "创始会员", amount: "金额", currency: "币种", cycle: "计费周期", monthly: "每月", yearly: "每年", oneTime: "一次性",
    reference: "EshipX 付款参考号", referenceHelp: "所有付费会员均为必填，包括先免费试用再开始计费的套餐。", note: "内部备注", trialDays: "可选免费试用天数", trialHelp: "无试用请输入 0。例如：免费 3 天 + 月度套餐。", create: "保存并开通会员", creating: "正在开通…", activated: "会员已保存并开通。",
    records: "订阅记录", refresh: "刷新", empty: "暂无手动订阅记录。", renew: "续费", cancelEnd: "到期取消", cancelNow: "立即取消", next: "下次", status: "状态",
    bulk: "批量套餐管理", bulkHelp: "仅修改订阅字段，笔记、任务、日历、聊天、课程和学习记录不会删除。", operation: "批量操作", reset: "重置套餐信息", grant: "赠送免费 Pro", target: "目标账户", allStudents: "所有学生", preview: "安全预览", affected: "个账户将受影响", confirmation: "输入完全一致的确认文字", executeReset: "重置所选套餐", executeGrant: "赠送免费权限", completedReset: "套餐重置完成", completedGrant: "免费权限已开通", resetWarning: "匹配账户将转为免费套餐，并取消有效的手动订阅。", grantWarning: "匹配账户将在同一全球时刻结束 Pro 权限，不会收费。", easternEnd: "美国东部时间结束（EST/EDT）", easternHelp: "系统自动处理夏令时，预览会显示准确 UTC 和您的当地时间。", autoAssign: "活动结束前，自动为新注册用户开通此套餐", utcEnd: "准确 UTC 结束时间", localEnd: "您的当地时间", activeCampaigns: "近期免费权限活动", campaignAuto: "自动分配给新用户", campaignManual: "仅现有用户",
    error: "操作未能完成。", confirmCancel: "确认此订阅操作吗？", emailNotice: "所有服务邮件都会使用用户保存的语言发送。",
    queue: "EshipX 付款匹配队列", queueHelp: "使用 EshipX 邮箱和唯一交易参考号匹配 OnPace 账户。", search: "搜索姓名、邮箱或参考号", allStatuses: "全部状态", submitted: "待审核", reviewing: "审核中", approved: "已激活", rejected: "已拒绝", canceled: "已取消", onpaceAccount: "OnPace 账户", payerAccount: "EshipX 付款邮箱", submittedAt: "提交时间", approve: "匹配并激活", reject: "拒绝", reviewNote: "内部备注", noClaims: "没有匹配的付款通知。", referenceRequired: "此操作需要唯一的 EshipX 参考号。", activationWarning: "这会立即开通权限并发送邮件。", renewalWarning: "请确认续费属于该用户。", approvedSuccess: "付款已匹配，订阅已激活。", rejectedSuccess: "通知已拒绝并告知用户。", renewedSuccess: "付款已记录，订阅已续费。", cancelledSuccess: "取消操作已保存。", emailDeliveryWarning: "操作已完成，但邮件未发送。请检查 Resend 和事件日志。", publishPending: "使用这些控件前，需要在最终 Supabase 发布中部署订阅服务。",
  },
} as const;

async function request(body: Record<string, unknown>) {
  const response = await fetch("/api/billing/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) throw new Error(data?.error || "Request failed");
  return data;
}

export function SubscriptionOperationsPanel({ language, profiles }: { language: Language; profiles: Profile[] }) {
  const t = COPY[language] || COPY.en;
  const navCopy = NAV_COPY[language] || NAV_COPY.en;
  const locale = { en: "en-US", tr: "tr-TR", es: "es-ES", zh: "zh-CN" }[language];
  const [panelTab, setPanelTab] = useState<PanelTab>("payments");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [operationSuccess, setOperationSuccess] = useState("");
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState("pro");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [trialDays, setTrialDays] = useState("0");
  const [providerReference, setProviderReference] = useState("");
  const [note, setNote] = useState("");
  const [bulkMode, setBulkMode] = useState<"reset" | "grant">("reset");
  const [targetPlan, setTargetPlan] = useState("all");
  const [endsAtEastern, setEndsAtEastern] = useState("");
  const [autoAssignNewUsers, setAutoAssignNewUsers] = useState(false);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [claimStatus, setClaimStatus] = useState("open");
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});
  const [renewalReferences, setRenewalReferences] = useState<Record<string, string>>({});

  const sortedProfiles = useMemo(() => [...profiles].sort((a, b) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "", locale)), [profiles, locale]);
  const filteredClaims = useMemo(() => claims.filter((claim) => {
    const statusMatches = claimStatus === "all" || (claimStatus === "open" ? ["submitted", "reviewing"].includes(claim.status) : claim.status === claimStatus);
    const haystack = `${claim.profiles?.full_name || ""} ${claim.profiles?.email || ""} ${claim.payer_email} ${claim.provider_reference || ""}`.toLocaleLowerCase(locale);
    return statusMatches && (!search.trim() || haystack.includes(search.trim().toLocaleLowerCase(locale)));
  }), [claims, claimStatus, search, locale]);
  const visibleSubscriptions = subscriptions.filter((item) => item.status !== "pending_activation");
  const filteredPurchaseHistory = useMemo(() => purchaseHistory.filter((record) => {
    const haystack = `${record.profiles?.full_name || ""} ${record.profiles?.email || ""} ${record.provider_reference || ""} ${record.plan_type} ${record.billing_cycle}`.toLocaleLowerCase(locale);
    return !search.trim() || haystack.includes(search.trim().toLocaleLowerCase(locale));
  }), [purchaseHistory, search, locale]);
  const statusLabel = (status: string) => ({ submitted: t.submitted, reviewing: t.reviewing, approved: t.approved, rejected: t.rejected, canceled: t.canceled }[status] || status);
  const draftFor = (claim: PaymentClaim): ReviewDraft => reviewDrafts[claim.id] || { reference: claim.provider_reference || "", amount: String(claim.quoted_amount || ""), currency: claim.currency || "USD", note: claim.admin_note || "" };
  const updateDraft = (claim: PaymentClaim, field: keyof ReviewDraft, value: string) => setReviewDrafts((current) => ({ ...current, [claim.id]: { ...draftFor(claim), [field]: value } }));
  const friendlyError = useCallback((caught: unknown) => {
    const message = caught instanceof Error ? caught.message : t.error;
    return /waiting for the final release|requested function|function.*not found/i.test(message) ? t.publishPending : message;
  }, [t]);

  async function load() {
    setLoading(true); setError("");
    try { const data = await request({ action: "list" }); setSubscriptions(data.subscriptions || []); setClaims(data.claims || []); setCampaigns(data.campaigns || []); setCancellationRequests(data.cancellationRequests || []); setPurchaseHistory(data.purchaseHistory || []); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    void request({ action: "list" })
      .then((data) => {
        if (!active) return;
        setSubscriptions(data.subscriptions || []);
        setClaims(data.claims || []);
        setCampaigns(data.campaigns || []);
        setCancellationRequests(data.cancellationRequests || []);
        setPurchaseHistory(data.purchaseHistory || []);
      })
      .catch((caught) => { if (active) setError(friendlyError(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [friendlyError]);

  async function createSubscription(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setOperationSuccess("");
    try {
      const result = await request({ action: "create", userId, plan, amount: Number(amount), currency, billingCycle, trialDays: Number(trialDays), providerReference, note });
      setOperationSuccess(result.email?.status === "sent" ? t.activated : `${t.activated} ${t.emailDeliveryWarning}`);
      setProviderReference(""); setNote(""); await load();
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setBusy(false); }
  }

  async function reviewClaim(claim: PaymentClaim, decision: "approve" | "reject") {
    const draft = draftFor(claim);
    if (decision === "approve" && !draft.reference.trim()) { setError(t.referenceRequired); return; }
    if (!window.confirm(decision === "approve" ? t.activationWarning : t.confirmCancel)) return;
    setBusy(true); setError(""); setOperationSuccess("");
    try {
      const result = await request(decision === "approve"
        ? { action: "approve_payment_claim", claimId: claim.id, providerReference: draft.reference, amount: Number(draft.amount), currency: draft.currency, adminNote: draft.note }
        : { action: "reject_payment_claim", claimId: claim.id, adminNote: draft.note });
      const success = decision === "approve" ? t.approvedSuccess : t.rejectedSuccess;
      setOperationSuccess(result.email?.status === "sent" ? success : `${success} ${t.emailDeliveryWarning}`);
      setReviewDrafts((current) => { const next = { ...current }; delete next[claim.id]; return next; });
      await load();
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setBusy(false); }
  }

  async function mutateSubscription(action: "renew" | "cancel", subscription: Subscription, immediate = false) {
    const reference = (renewalReferences[subscription.id] || "").trim();
    if (action === "renew" && reference.length < 3) { setError(t.referenceRequired); return; }
    if (!window.confirm(action === "renew" ? t.renewalWarning : t.confirmCancel)) return;
    setBusy(true); setError(""); setOperationSuccess("");
    try {
      const result = await request({ action, subscriptionId: subscription.id, providerReference: action === "renew" ? reference : undefined, amount: action === "renew" ? subscription.amount : undefined, currency: action === "renew" ? subscription.currency : undefined, effectiveAt: action === "cancel" ? (immediate ? new Date().toISOString() : subscription.period_end) : undefined });
      const success = action === "renew" ? t.renewedSuccess : t.cancelledSuccess;
      setOperationSuccess(result.email?.status === "sent" ? success : `${success} ${t.emailDeliveryWarning}`);
      if (action === "renew") setRenewalReferences((current) => ({ ...current, [subscription.id]: "" }));
      await load();
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setBusy(false); }
  }

  async function resolveCancellationRequest(item: CancellationRequest, decision: "approved" | "rejected") {
    if (!window.confirm(t.confirmCancel)) return;
    setBusy(true); setError(""); setOperationSuccess("");
    try {
      const result = await request({ action: "resolve_cancellation_request", requestId: item.id, decision });
      setOperationSuccess(result.email?.status === "sent" ? t.cancelledSuccess : `${t.cancelledSuccess} ${t.emailDeliveryWarning}`);
      await load();
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setBusy(false); }
  }

  async function deletePurchaseRecord(record: PurchaseRecord) {
    const confirmText = language === "tr"
      ? "Bu satın alma kaydını silmek istiyor musunuz? Bu işlem üyelik erişimini değiştirmez."
      : "Delete this purchase record? This does not change membership access.";
    if (!window.confirm(confirmText)) return;
    setBusy(true); setError("");
    try { await request({ action: "delete_purchase_history", recordId: record.id }); await load(); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setBusy(false); }
  }

  function clearPreview() { setPreview(null); setConfirmation(""); setBulkSuccess(""); }
  async function createPreview() {
    setBusy(true); setError(""); clearPreview();
    try { setPreview(await request({ action: "bulk_preview", mode: bulkMode, targetPlan, endsAtEastern: bulkMode === "grant" ? endsAtEastern : undefined, autoAssignNewUsers: bulkMode === "grant" && autoAssignNewUsers })); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setBusy(false); }
  }
  async function executeBulk() {
    if (!preview || confirmation !== preview.confirmationText) return;
    setBusy(true); setError("");
    try {
      const data = await request({ action: "bulk_execute", operationId: preview.operationId, previewToken: preview.previewToken, confirmation });
      setBulkSuccess(`${bulkMode === "grant" ? t.completedGrant : t.completedReset}: ${data.affectedCount}`); setPreview(null); setConfirmation(""); await load();
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setBusy(false); }
  }

  const navigation: Array<{ id: PanelTab; label: string; icon: typeof CreditCard }> = [
    { id: "payments", label: navCopy.payments, icon: MailCheck },
    { id: "activate", label: navCopy.activate, icon: UserPlus },
    { id: "subscriptions", label: navCopy.subscriptions, icon: ReceiptText },
    { id: "campaigns", label: navCopy.campaigns, icon: UsersRound },
    { id: "catalog", label: navCopy.catalog, icon: Settings2 },
  ];
  const pendingClaims = claims.filter((claim) => ["submitted", "reviewing"].includes(claim.status)).length;
  const activeSubscriptions = visibleSubscriptions.filter((subscription) => ["active", "cancel_at_period_end"].includes(subscription.status)).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-gray-150 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-brand-dark p-5 text-white sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-indigo-200 ring-1 ring-white/15"><CreditCard size={23} /></span><div><h2 className="text-xl font-black sm:text-2xl">{t.title}</h2><p className="mt-1.5 max-w-3xl text-xs leading-5 text-indigo-100/75 sm:text-sm">{t.subtitle}</p></div></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:min-w-[470px]">
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-200">{navCopy.pending}</p><p className="mt-1 text-xl font-black">{pendingClaims}</p></div>
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-200">{navCopy.active}</p><p className="mt-1 text-xl font-black">{activeSubscriptions}</p></div>
              <div className="col-span-2 rounded-2xl bg-emerald-400/10 p-3 text-emerald-100 ring-1 ring-emerald-300/15 sm:col-span-1"><p className="text-[9px] font-bold uppercase tracking-wider">{navCopy.protected}</p><ShieldCheck className="mt-1" size={20} /></div>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><ShieldCheck className="mt-0.5 shrink-0" size={15} /><span>{t.emailNotice}</span></div>
        {error && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
        {operationSuccess && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{operationSuccess}</div>}

        <nav className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-label={t.title}>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setPanelTab(id)} className={`flex items-center gap-2 rounded-2xl border px-3.5 py-3 text-left text-xs font-extrabold transition ${panelTab === id ? "border-brand bg-brand text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:border-brand/30 hover:text-brand"}`}>
              <Icon size={16} className="shrink-0" /><span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        <div className={`${panelTab === "payments" ? "mt-6" : "hidden"} rounded-3xl border border-indigo-100 bg-indigo-50/35 p-4 sm:p-5`}>
          <div className="flex items-start gap-3"><span className="rounded-2xl bg-white p-2.5 text-brand shadow-sm"><MailCheck size={19} /></span><div><h3 className="text-sm font-extrabold text-surface-dark sm:text-base">{t.queue}</h3><p className="mt-1 text-xs leading-5 text-gray-500">{t.queueHelp}</p></div></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs" /></label><select value={claimStatus} onChange={(event) => setClaimStatus(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold"><option value="open">{t.submitted} + {t.reviewing}</option><option value="all">{t.allStatuses}</option><option value="approved">{t.approved}</option><option value="rejected">{t.rejected}</option></select></div>
          <div className="mt-4 space-y-3">{filteredClaims.length === 0 ? <p className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 py-8 text-center text-xs text-gray-400">{t.noClaims}</p> : filteredClaims.map((claim) => { const draft = draftFor(claim); const open = ["submitted", "reviewing"].includes(claim.status); return <article key={claim.id} className="rounded-2xl border border-gray-150 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-3"><div><p className="text-[10px] font-bold uppercase text-gray-400">{t.onpaceAccount}</p><p className="mt-1 truncate text-sm font-extrabold">{claim.profiles?.full_name || claim.profiles?.email}</p><p className="truncate text-xs text-gray-500">{claim.profiles?.email}</p></div><div><p className="text-[10px] font-bold uppercase text-gray-400">{t.payerAccount}</p><p className="mt-1 break-all text-sm font-bold text-indigo-700">{claim.payer_email}</p><p className="text-xs text-gray-500">{claim.plan_type} · {claim.quoted_amount} {claim.currency}</p></div><div className="lg:text-right"><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800">{statusLabel(claim.status)}</span><p className="mt-2 text-[10px] text-gray-400">{t.submittedAt}: {new Date(claim.submitted_at).toLocaleString(locale)}</p></div></div>{open && <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-[10px] font-bold uppercase text-gray-500">{t.reference}<input value={draft.reference} onChange={(e) => updateDraft(claim, "reference", e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs normal-case" /></label><label className="text-[10px] font-bold uppercase text-gray-500">{t.amount}<input type="number" min="0.01" step="0.01" value={draft.amount} onChange={(e) => updateDraft(claim, "amount", e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs normal-case" /></label><label className="text-[10px] font-bold uppercase text-gray-500">{t.currency}<select value={draft.currency} onChange={(e) => updateDraft(claim, "currency", e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs normal-case"><option>USD</option><option>EUR</option><option>TRY</option><option>GBP</option></select></label><label className="text-[10px] font-bold uppercase text-gray-500">{t.reviewNote}<input value={draft.note} onChange={(e) => updateDraft(claim, "note", e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs normal-case" /></label><div className="flex gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end"><button type="button" disabled={busy} onClick={() => void reviewClaim(claim, "reject")} className="rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-700"><XCircle className="mr-1 inline" size={14} />{t.reject}</button><button type="button" disabled={busy || !draft.reference || !draft.amount} onClick={() => void reviewClaim(claim, "approve")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"><CheckCircle2 className="mr-1 inline" size={14} />{t.approve}</button></div></div>}</article>; })}</div>
        </div>

        <form onSubmit={createSubscription} className={`${panelTab === "activate" ? "mt-6" : "hidden"} rounded-3xl border border-gray-150 bg-slate-50/40 p-4 sm:p-6`}>
          <h3 className="text-sm font-extrabold text-surface-dark">{t.direct}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-gray-600 lg:col-span-2">{t.user}<select required value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="">{t.choose}</option>{sortedProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name || profile.email || profile.id} · {profile.email}</option>)}</select></label>
            <label className="text-xs font-bold text-gray-600">{t.plan}<select value={plan} onChange={(e) => { const next = e.target.value; setPlan(next); if (next === "founding") { setBillingCycle("one_time"); setTrialDays("0"); } else if (billingCycle === "one_time") setBillingCycle("monthly"); }} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="pro">{t.pro}</option><option value="founding">{t.founding}</option></select></label>
            <label className="text-xs font-bold text-gray-600">{t.cycle}<select value={billingCycle} onChange={(e) => { setBillingCycle(e.target.value); if (e.target.value === "one_time") { setPlan("founding"); setTrialDays("0"); } else setPlan("pro"); }} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="monthly">{t.monthly}</option><option value="yearly">{t.yearly}</option><option value="one_time">{t.oneTime}</option></select></label>
            <label className="text-xs font-bold text-gray-600">{t.amount}<input required min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></label>
            <label className="text-xs font-bold text-gray-600">{t.currency}<select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"><option>USD</option><option>EUR</option><option>TRY</option><option>GBP</option></select></label>
            <label className="text-xs font-bold text-gray-600 sm:col-span-2">{t.trialDays}<input disabled={billingCycle === "one_time"} required min="0" max="365" type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm disabled:bg-gray-100" /><span className="mt-1 block text-[10px] font-normal leading-4 text-gray-400">{t.trialHelp}</span></label>
            <label className="text-xs font-bold text-gray-600 sm:col-span-2 lg:col-span-4">{t.reference}<input required value={providerReference} onChange={(e) => setProviderReference(e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /><span className="mt-1 block text-[10px] font-normal leading-4 text-gray-400">{t.referenceHelp}</span></label>
            <label className="text-xs font-bold text-gray-600 sm:col-span-2 lg:col-span-4">{t.note}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></label>
          </div>
          <button disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto">{busy && <Loader2 size={16} className="animate-spin" />}{busy ? t.creating : t.create}</button>
        </form>
        </div>
      </section>

      <section className={`${panelTab === "subscriptions" ? "block" : "hidden"} rounded-3xl border border-gray-150 bg-white p-4 shadow-sm sm:p-6`}>
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-surface-dark">{t.records}</h3><button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-600"><RefreshCw size={13} className={loading ? "animate-spin" : ""} />{t.refresh}</button></div>
        <div className="mt-5 rounded-2xl border border-brand/15 bg-brand/5 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold text-surface-dark">{language === "tr" ? "Satın alma geçmişi" : language === "es" ? "Historial de compras" : language === "zh" ? "购买记录" : "Purchase history"}</p><p className="mt-1 text-xs text-gray-500">{language === "tr" ? "Kullanıcı, referans veya pakete göre ara. Kayıt silmek erişimi değiştirmez." : "Search by user, reference, or plan. Deleting a record does not change access."}</p></div><label className="relative min-w-0 sm:w-80"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs" /></label></div><div className="mt-3 max-h-72 overflow-auto rounded-xl border border-white bg-white">{filteredPurchaseHistory.length === 0 ? <p className="p-4 text-xs text-gray-400">{language === "tr" ? "Satın alma kaydı bulunamadı." : "No purchase records found."}</p> : filteredPurchaseHistory.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-3 last:border-0"><div className="min-w-0"><p className="truncate text-xs font-extrabold text-surface-dark">{record.profiles?.full_name || record.profiles?.email || "—"}</p><p className="mt-0.5 text-[11px] text-gray-500">{record.plan_type} · {record.billing_cycle} · {record.amount} {record.currency} · {record.provider_reference || "—"}</p></div><div className="flex items-center gap-2"><span className="text-[10px] text-gray-400">{new Date(record.created_at).toLocaleDateString(locale)}</span><button type="button" disabled={busy} onClick={() => void deletePurchaseRecord(record)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{language === "tr" ? "Sil" : language === "es" ? "Eliminar" : language === "zh" ? "删除" : "Delete"}</button></div></div>)}</div></div>
        {cancellationRequests.filter((item) => item.status === "submitted").length > 0 && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-extrabold text-amber-900">{language === "tr" ? "Bekleyen iptal talepleri" : language === "es" ? "Solicitudes de cancelación pendientes" : language === "zh" ? "待处理的取消请求" : "Pending cancellation requests"}</p><div className="mt-3 grid gap-2 lg:grid-cols-2">{cancellationRequests.filter((item) => item.status === "submitted").map((item) => <article key={item.id} className="rounded-xl border border-amber-200 bg-white p-3"><p className="text-xs font-extrabold text-surface-dark">{item.profiles?.full_name || item.profiles?.email}</p><p className="mt-1 text-[11px] text-gray-500">{item.manual_subscriptions?.plan} · {item.manual_subscriptions?.billing_cycle} · {item.manual_subscriptions?.provider_reference || "—"}</p><div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void resolveCancellationRequest(item, "approved")} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white">{language === "tr" ? "İptali onayla" : language === "es" ? "Aprobar cancelación" : language === "zh" ? "批准取消" : "Approve cancellation"}</button><button type="button" disabled={busy} onClick={() => void resolveCancellationRequest(item, "rejected")} className="rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-700">{language === "tr" ? "Reddet" : language === "es" ? "Rechazar" : language === "zh" ? "拒绝" : "Reject"}</button></div></article>)}</div></div>}
        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand" /></div> : visibleSubscriptions.length === 0 ? <p className="py-8 text-center text-xs text-gray-400">{t.empty}</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{visibleSubscriptions.map((subscription) => { const canRenew = ["active", "cancel_at_period_end", "expired"].includes(subscription.status) && ["monthly", "yearly"].includes(subscription.billing_cycle); return <article key={subscription.id} className="rounded-2xl border border-gray-150 p-4"><div className="flex justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{subscription.profiles?.full_name || subscription.profiles?.email}</p><p className="truncate text-xs text-gray-400">{subscription.profiles?.email}</p></div><span className="h-fit rounded-full bg-brand/10 px-2 py-1 text-[10px] font-black uppercase text-brand">{subscription.status}</span></div><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-gray-400">{t.amount}</dt><dd className="font-bold">{subscription.amount} {subscription.currency}</dd></div><div><dt className="text-gray-400">{t.cycle}</dt><dd className="font-bold">{subscription.billing_cycle}{subscription.trial_days ? ` + ${subscription.trial_days} ${t.trialDays}` : ""}</dd></div><div><dt className="text-gray-400">{t.reference}</dt><dd className="break-all font-semibold">{subscription.provider_reference || "—"}</dd></div><div><dt className="text-gray-400">{t.next}</dt><dd className="font-semibold">{subscription.next_renewal_at ? new Date(subscription.next_renewal_at).toLocaleDateString(locale) : "—"}</dd></div></dl>{canRenew && <input value={renewalReferences[subscription.id] || ""} onChange={(e) => setRenewalReferences((current) => ({ ...current, [subscription.id]: e.target.value }))} placeholder={t.reference} className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs" />}<div className="mt-3 grid gap-2 sm:grid-cols-3"><button disabled={busy || !canRenew || !(renewalReferences[subscription.id] || "").trim()} onClick={() => void mutateSubscription("renew", subscription)} className="rounded-lg bg-brand/10 px-2 py-2 text-[11px] font-bold text-brand disabled:opacity-40">{t.renew}</button><button disabled={busy || ["canceled", "expired", "refunded"].includes(subscription.status)} onClick={() => void mutateSubscription("cancel", subscription)} className="rounded-lg bg-amber-50 px-2 py-2 text-[11px] font-bold text-amber-700 disabled:opacity-40">{t.cancelEnd}</button><button disabled={busy || ["canceled", "expired", "refunded"].includes(subscription.status)} onClick={() => void mutateSubscription("cancel", subscription, true)} className="rounded-lg bg-red-50 px-2 py-2 text-[11px] font-bold text-red-700 disabled:opacity-40">{t.cancelNow}</button></div></article>; })}</div>}
      </section>

      <section className={`${panelTab === "campaigns" ? "block" : "hidden"} rounded-3xl border bg-white p-4 shadow-sm sm:p-6 ${bulkMode === "grant" ? "border-emerald-200" : "border-red-200"}`}>
        <div className="flex items-start gap-3"><span className={`rounded-2xl p-2.5 ${bulkMode === "grant" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{bulkMode === "grant" ? <Gift size={20} /> : <AlertTriangle size={20} />}</span><div><h3 className="text-sm font-extrabold text-surface-dark sm:text-base">{t.bulk}</h3><p className="mt-1 text-xs leading-5 text-gray-500">{t.bulkHelp}</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold text-gray-600">{t.operation}<select value={bulkMode} onChange={(e) => { setBulkMode(e.target.value as "reset" | "grant"); clearPreview(); }} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="reset">{t.reset}</option><option value="grant">{t.grant}</option></select></label><label className="text-xs font-bold text-gray-600">{t.target}<select value={targetPlan} onChange={(e) => { setTargetPlan(e.target.value); clearPreview(); }} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="all">{t.allStudents}</option><option value="free">Free</option><option value="pro">Pro</option><option value="founding">Founding</option></select></label>{bulkMode === "grant" && <><label className="text-xs font-bold text-gray-600 sm:col-span-2">{t.easternEnd}<input required type="datetime-local" value={endsAtEastern} onChange={(e) => { setEndsAtEastern(e.target.value); clearPreview(); }} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /><span className="mt-1 block text-[10px] font-normal leading-4 text-gray-400">{t.easternHelp}</span></label><label className="flex items-start gap-2 rounded-xl border border-gray-200 p-3 text-xs font-semibold text-gray-700 sm:col-span-2 lg:col-span-4"><input type="checkbox" checked={autoAssignNewUsers} onChange={(e) => { setAutoAssignNewUsers(e.target.checked); clearPreview(); }} className="mt-0.5 h-4 w-4 accent-brand" /><span>{t.autoAssign}</span></label></>}</div>
        <div className={`mt-4 rounded-xl p-3 text-xs font-semibold leading-5 ${bulkMode === "grant" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{bulkMode === "grant" ? t.grantWarning : t.resetWarning}</div>
        <button type="button" disabled={busy || (bulkMode === "grant" && !endsAtEastern)} onClick={() => void createPreview()} className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-surface-dark disabled:opacity-50">{t.preview}</button>
        {preview && <div className="mt-4 rounded-2xl border border-gray-200 p-4"><p className="text-sm font-extrabold text-surface-dark">{preview.previewCount} {t.affected}</p>{preview.endsAtUtc && <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-gray-400">{t.utcEnd}</dt><dd className="mt-1 font-semibold text-surface-dark">{new Date(preview.endsAtUtc).toLocaleString("en-GB", { timeZone: "UTC", timeZoneName: "short" })}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="font-bold text-gray-400">{t.localEnd}</dt><dd className="mt-1 font-semibold text-surface-dark">{new Date(preview.endsAtUtc).toLocaleString(locale, { timeZoneName: "short" })}</dd></div></dl>}<p className="mt-3 text-xs font-bold text-gray-600">{t.confirmation}</p><code className="mt-1 block rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold">{preview.confirmationText}</code><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /><button type="button" disabled={busy || confirmation !== preview.confirmationText} onClick={() => void executeBulk()} className={`mt-3 w-full rounded-xl px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto ${bulkMode === "grant" ? "bg-emerald-600" : "bg-red-600"}`}>{bulkMode === "grant" ? t.executeGrant : t.executeReset}</button></div>}
        {bulkSuccess && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{bulkSuccess}</p>}
        {campaigns.length > 0 && <div className="mt-6 border-t border-gray-100 pt-5"><h4 className="text-xs font-extrabold uppercase tracking-wide text-gray-500">{t.activeCampaigns}</h4><div className="mt-3 grid gap-2 sm:grid-cols-2">{campaigns.slice(0, 6).map((campaign) => <div key={campaign.id} className="rounded-xl border border-gray-150 p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-bold text-surface-dark">Pro · {campaign.target_filter?.plan || "all"}</span><span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-500">{campaign.status}</span></div><p className="mt-2 text-gray-600">{new Date(campaign.ends_at).toLocaleString(locale, { timeZoneName: "short" })}</p><p className="mt-1 text-[10px] font-semibold text-gray-400">{campaign.auto_assign_new_users ? t.campaignAuto : t.campaignManual}</p></div>)}</div></div>}
      </section>
      {panelTab === "catalog" && <PaymentCatalogSettings language={language} />}
    </div>
  );
}
