"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Check,
  ShieldCheck,
  Loader2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Mail,
  Clock3,
  CheckCircle2,
  ArrowRight,
  ReceiptText,
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

type PaymentClaim = {
  id: string;
  plan_type: string;
  billing_cycle: string;
  payer_email: string;
  quoted_amount: number;
  currency: string;
  status: string;
  provider_reference?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  manual_subscriptions?: {
    status?: string | null;
    period_end?: string | null;
    cancellation_effective_at?: string | null;
  } | null;
};
type BillingProfile = {
  id: string;
  email?: string | null;
  language?: string | null;
  plan?: string | null;
  billing_cycle?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  pro_expires_at?: string | null;
  next_billing_date?: string | null;
  complimentary_campaign_id?: string | null;
  timezone?: string | null;
  discount_percent?: number | null;
};
type ManualSubscription = {
  id: string;
  plan: "pro" | "founding";
  billing_cycle: "monthly" | "yearly" | "one_time" | "trial";
  renewal_cycle?: "monthly" | "yearly" | null;
  trial_days?: number | null;
  status: string;
  period_start: string;
  period_end?: string | null;
  next_renewal_at?: string | null;
  activated_at?: string | null;
};
type CancellationRequest = {
  id: string;
  subscription_id: string;
  status: "submitted" | "approved" | "rejected";
  requested_at: string;
  reviewed_at?: string | null;
};
type Invoice = {
  id: string; created_at: string; plan_type: string; billing_cycle: string;
  amount: number; provider_reference?: string | null; stripe_payment_intent_id?: string | null;
};
type BillingPlan = {
  title: string; type: string; cycle: string; price: number; period: string;
  description: string; features: string[]; badge: string; badgeStyle: string;
  cta: string; disabled: boolean; highlight?: boolean;
};
type BillingSettings = {
  payment_gateway_enabled?: boolean;
  payment_disabled_message?: Record<string, string>;
  plan_prices?: Record<string, number>;
  payment_checkout_urls?: Record<string, string>;
  plan_names?: Record<string, Partial<Record<"en" | "tr" | "es" | "zh", string>>>;
};

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [manualSubscription, setManualSubscription] = useState<ManualSubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Provider-hosted checkout state
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentClaims, setPaymentClaims] = useState<PaymentClaim[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);
  const [requestingCancellation, setRequestingCancellation] = useState(false);
  const [cancellationConfirmOpen, setCancellationConfirmOpen] = useState(false);
  const [payerEmail, setPayerEmail] = useState("");
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Custom Alert Popups
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  // Promocode States
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    setPromoError(null);
    setPromoSuccessMsg(null);

    try {
      const res = await fetch("/api/promocode/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode })
      });
      const data = await res.json();
      if (data.error) {
        setPromoError(data.error);
      } else {
        setPromoSuccessMsg(data.message);
        // Refresh profile data
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          setProfile(updatedProfile);
        }
      }
    } catch {
      setPromoError("Network error applying promo code.");
    }
    setApplyingPromo(false);
  };

  const [systemSettings, setSystemSettings] = useState<BillingSettings | null>(null);

  const lang = profile?.language || "en";
  const t = getTranslations(lang);

  useEffect(() => {
    async function loadBillingData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Refresh time-based access before showing the current plan. This keeps
      // complimentary campaigns and trials accurate without touching study data.
      await supabase.rpc("refresh_my_subscription_access");

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const { data: manualRows } = await supabase
        .from("manual_subscriptions")
        .select("id, plan, billing_cycle, renewal_cycle, trial_days, status, period_start, period_end, next_renewal_at, activated_at")
        .eq("user_id", user.id)
        .in("status", ["active", "cancel_at_period_end"])
        .order("activated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(5);
      const activeManual = (manualRows || []).find((subscription) =>
        subscription.billing_cycle === "one_time" ||
        !subscription.period_end ||
        new Date(subscription.period_end) > new Date()
      );
      setManualSubscription((activeManual as ManualSubscription | undefined) || null);

      // Fetch system settings for payment toggle & pricing
      const { data: settingsRows } = await supabase.rpc(
        "get_public_system_settings"
      );
      const sysData = Array.isArray(settingsRows)
        ? settingsRows[0]
        : settingsRows;
      if (sysData) {
        setSystemSettings(sysData);
      }

      // Fetch invoices
      const { data: historyData } = await supabase
        .from("purchase_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (historyData) {
        setInvoices(historyData);
      }

      try {
        const [claimsResponse, cancellationResponse] = await Promise.all([
          fetch("/api/billing/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "my_payment_claims" }) }),
          fetch("/api/billing/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "my_cancellation_requests" }) }),
        ]);
        const [claimsData, cancellationData] = await Promise.all([
          claimsResponse.json().catch(() => ({})),
          cancellationResponse.json().catch(() => ({})),
        ]);
        if (claimsResponse.ok) setPaymentClaims(claimsData.claims || []);
        if (cancellationResponse.ok) setCancellationRequests(cancellationData.requests || []);
      } catch {
        // Billing history remains usable if claim status is temporarily unavailable.
      }

      setLoading(false);
    }
    loadBillingData();
  }, [router, supabase]);

  const handleOpenCheckout = (plan: BillingPlan) => {
    if (!systemSettings?.payment_gateway_enabled) {
      const disabledMsg =
        systemSettings?.payment_disabled_message?.[lang] ||
        systemSettings?.payment_disabled_message?.en ||
        (lang === "tr"
          ? "Plan değişikliği yalnızca size verilen promocode üzerinden veya sistem yöneticiniz tarafından yapılabilir."
          : "Plan changes can only be made using a promo code issued to you or by your system administrator.");
      setCustomAlert(disabledMsg);
    } else if (
      plan.type !== "free" &&
      !(systemSettings?.payment_checkout_urls
        ? systemSettings.payment_checkout_urls[plan.type]
        : plan.type === "pro_monthly")
    ) {
      setCustomAlert(claimCopy.checkoutUnavailable);
    } else {
      const dynamicPrice = systemSettings?.plan_prices?.[plan.type] ?? plan.price;
      setSelectedPlan({ ...plan, price: dynamicPrice });
      setPayerEmail("");
      setCheckoutOpened(false);
      setPaymentConfirmed(false);
      setClaimSuccess(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setCheckingOut(true);

    const paymentWindow = window.open("about:blank", "_blank");
    if (paymentWindow) paymentWindow.opener = null;
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_type: selectedPlan.type,
          billing_cycle: selectedPlan.cycle
        })
      });

      const data = await response.json();

      if (response.ok && data.checkoutUrl) {
        if (paymentWindow) paymentWindow.location.href = data.checkoutUrl;
        else window.location.href = data.checkoutUrl;
        setCheckoutOpened(true);
      } else {
        paymentWindow?.close();
        setCustomAlert(response.status === 503 ? claimCopy.checkoutUnavailable : claimCopy.noticeError);
      }
    } catch {
      paymentWindow?.close();
      setCustomAlert(claimCopy.networkError);
    }
    setCheckingOut(false);
  };

  const handleSubmitPaymentClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPlan || !paymentConfirmed || !payerEmail.trim()) return;
    setSubmittingClaim(true);
    try {
      const response = await fetch("/api/billing/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_payment_claim", planType: selectedPlan.type, payerEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) throw new Error(response.status === 409 ? claimCopy.alreadyPending : claimCopy.noticeError);
      setClaimSuccess(true);
      setPaymentClaims((current) => [data.claim, ...current]);
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : claimCopy.noticeError);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleRequestCancellation = async () => {
    const copy = {
      en: { success: "Your cancellation request was received. We will confirm the outcome by email as soon as possible.", error: "We could not send your cancellation request. Please try again." },
      tr: { success: "İptal talebiniz alındı. Sonucu en kısa sürede e-posta ile bildireceğiz.", error: "İptal talebiniz gönderilemedi. Lütfen tekrar deneyin." },
      es: { success: "Recibimos tu solicitud de cancelación. Confirmaremos el resultado por correo lo antes posible.", error: "No pudimos enviar tu solicitud de cancelación. Inténtalo de nuevo." },
      zh: { success: "我们已收到您的取消请求。我们会尽快通过电子邮件确认处理结果。", error: "无法发送取消请求，请重试。" },
    }[(profile?.language || "en") as "en" | "tr" | "es" | "zh"] || { success: "Request sent.", error: "Request failed." };
    setCancellationConfirmOpen(false);
    setRequestingCancellation(true);
    try {
      const response = await fetch("/api/billing/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request_cancellation" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) throw new Error(data?.error || copy.error);
      setCancellationRequests((current) => [data.request, ...current]);
      setCustomAlert(copy.success);
    } catch (error) {
      setCustomAlert(error instanceof Error ? error.message : copy.error);
    } finally {
      setRequestingCancellation(false);
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

  // Resolve the user's real access from both the profile cache and the latest
  // active administrator-managed subscription. The latter wins when a bulk
  // operation left the profile's display fields temporarily stale.
  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const profileTrialActive = Boolean(trialEnds && trialEnds > now);
  const profileAccessEnds = profile?.pro_expires_at
    ? new Date(profile.pro_expires_at)
    : trialEnds;
  const profileHasPaidAccess =
    (profile?.plan === "pro" || profile?.plan === "founding") &&
    profile?.subscription_status !== "expired" &&
    (!profileAccessEnds || profileAccessEnds > now);
  const manualAccessEnds = manualSubscription?.period_end
    ? new Date(manualSubscription.period_end)
    : null;
  const manualHasAccess = Boolean(
    manualSubscription &&
    (manualSubscription.billing_cycle === "one_time" || !manualAccessEnds || manualAccessEnds > now)
  );
  // A manually verified payment always takes priority over an older trial or
  // complimentary campaign that may still be present on the cached profile.
  const isTrialActive = !manualHasAccess && profileTrialActive;
  const hasProAccess = manualHasAccess || profileHasPaidAccess || Boolean(isTrialActive);
  const effectivePlan = manualHasAccess
    ? manualSubscription?.plan || "pro"
    : hasProAccess
      ? profile?.plan || "pro"
      : "free";
  const effectiveBillingCycle = manualHasAccess
    ? manualSubscription?.billing_cycle === "one_time"
      ? "lifetime"
      : manualSubscription?.renewal_cycle || manualSubscription?.billing_cycle || "none"
    : profile?.billing_cycle || "none";
  const effectiveAccessEnds = manualHasAccess && manualAccessEnds
    ? manualAccessEnds
    : profileAccessEnds;
  const isComplimentaryAccess =
    hasProAccess && !manualHasAccess &&
    (Boolean(profile?.complimentary_campaign_id) || effectiveBillingCycle === "none");
  const effectivePlanType = !hasProAccess
    ? "free"
    : effectivePlan === "founding" || effectiveBillingCycle === "lifetime"
      ? "founding_member"
      : effectiveBillingCycle === "yearly"
        ? "pro_yearly"
        : effectiveBillingCycle === "monthly"
          ? "pro_monthly"
          : "complimentary_pro";
  const discountPercent = Math.max(0, Math.min(100, Number(profile?.discount_percent) || 0));
  const localized = <T,>(values: { en: T; tr: T; es: T; zh: T }): T =>
    values[(["en", "tr", "es", "zh"].includes(lang) ? lang : "en") as keyof typeof values];
  const dateLocale = localized({
    en: "en-US",
    tr: "tr-TR",
    es: "es-ES",
    zh: "zh-CN",
  });
  const accessCopy = localized({
    en: {
      eyebrow: "Your current access",
      active: "Active",
      cancelsAtPeriodEnd: "Cancels at period end",
      canceled: "Canceled",
      complimentary: "Complimentary Pro",
      lifetime: "Lifetime access",
      renews: "Renews",
      ends: "Access ends",
      trial: "Free period ends",
      freeDetail: "You currently have access to the Free plan features.",
      complimentaryDetail: "Pro was assigned to your account at no charge. No payment will be collected for this access period.",
      lifetimeDetail: "Your Pro access does not expire.",
      recurringDetail: "Your active subscription and its next important date are shown here.",
      cancelScheduledDetail: "Your renewal has been canceled. You can continue using your plan until the access end date shown here.",
    },
    tr: {
      eyebrow: "Mevcut erişiminiz",
      active: "Aktif",
      cancelsAtPeriodEnd: "Dönem sonunda iptal edilecek",
      canceled: "İptal edildi",
      complimentary: "Ücretsiz Pro",
      lifetime: "Ömür boyu erişim",
      renews: "Yenilenme",
      ends: "Erişim bitişi",
      trial: "Ücretsiz dönem bitişi",
      freeDetail: "Şu anda Ücretsiz plan özelliklerine erişiminiz var.",
      complimentaryDetail: "Pro erişimi hesabınıza ücretsiz tanımlandı. Bu erişim dönemi için ödeme alınmaz.",
      lifetimeDetail: "Pro erişiminizin bitiş tarihi yoktur.",
      recurringDetail: "Aktif aboneliğiniz ve bir sonraki önemli tarihi burada gösterilir.",
      cancelScheduledDetail: "Yenilemeniz iptal edildi. Aşağıdaki erişim bitiş tarihine kadar paketinizi kullanmaya devam edebilirsiniz.",
    },
    es: {
      eyebrow: "Tu acceso actual",
      active: "Activo",
      cancelsAtPeriodEnd: "Se cancelará al final del periodo",
      canceled: "Cancelado",
      complimentary: "Pro gratuito",
      lifetime: "Acceso de por vida",
      renews: "Renovación",
      ends: "Fin del acceso",
      trial: "Fin del periodo gratuito",
      freeDetail: "Actualmente tienes acceso a las funciones del plan Gratis.",
      complimentaryDetail: "Se asignó Pro a tu cuenta sin coste. No se cobrará este periodo de acceso.",
      lifetimeDetail: "Tu acceso Pro no caduca.",
      recurringDetail: "Aquí se muestran tu suscripción activa y su próxima fecha importante.",
      cancelScheduledDetail: "Tu renovación fue cancelada. Puedes seguir usando tu plan hasta la fecha de finalización mostrada.",
    },
    zh: {
      eyebrow: "您当前的访问权限",
      active: "已激活",
      cancelsAtPeriodEnd: "将在本期结束时取消",
      canceled: "已取消",
      complimentary: "免费 Pro",
      lifetime: "终身访问",
      renews: "续费时间",
      ends: "访问截止",
      trial: "免费期截止",
      freeDetail: "您当前可使用免费方案功能。",
      complimentaryDetail: "您的账户已免费获得 Pro，此访问期间不会收费。",
      lifetimeDetail: "您的 Pro 访问权限永不到期。",
      recurringDetail: "此处显示当前订阅及下一个重要日期。",
      cancelScheduledDetail: "续订已取消。您可以继续使用当前方案，直到下方显示的访问截止时间。",
    },
  });
  const claimCopy = localized({
    en: {
      secureTitle: "Pay securely on EshipX",
      secureDescription: "OnPace never receives your card details. Payment is completed on the EshipX page and access is activated after manual verification.",
      stepPlan: "1. Check your plan",
      stepPay: "2. Complete payment on EshipX",
      stepReturn: "3. Return here and send the payment notice",
      openPayment: "Open EshipX payment page",
      opened: "Payment page opened",
      payerEmail: "Email used for your EshipX payment",
      payerEmailHelp: "It may differ from your OnPace email. We use it only to match the payment.",
      confirm: "I completed the payment on EshipX and the email above is correct.",
      submit: "I completed the payment",
      submitting: "Sending for review…",
      successTitle: "Payment notice received",
      successText: "Your payment notice has been sent to our team. Thank you — we will activate your subscription as soon as your EshipX payment is verified, and email you immediately once activation is complete.",
      close: "Done",
      pendingTitle: "Payment review status",
      pendingText: "These notices are matched manually with EshipX transactions.",
      submitted: "Awaiting review",
      reviewing: "Being reviewed",
      approved: "Activated",
      rejected: "Could not be matched",
      canceled: "Canceled",
      paymentReference: "Payment reference",
      checkoutUnavailable: "This plan's EshipX link is not configured yet.",
      promo: "Promo code",
      apply: "Apply",
      discountApplied: "discount applied",
      providerAmountFinal: "The final charge is the amount shown on EshipX. Any promo benefit is checked by the administrator while matching your payment.",
      noticeError: "The payment notice could not be submitted. Please try again.",
      alreadyPending: "You already have a payment notice awaiting review.",
      networkError: "The payment service could not be reached. Please check your connection and try again.",
    },
    tr: {
      secureTitle: "eShipX üzerinden güvenli ödeme",
      secureDescription: "OnPace kart bilgilerinizi hiçbir zaman almaz. Ödeme eShipX sayfasında tamamlanır ve erişim manuel doğrulamadan sonra açılır.",
      stepPlan: "1. Paketini kontrol et",
      stepPay: "2. eShipX üzerinden ödemeyi tamamla",
      stepReturn: "3. Bu ekrana dönüp ödeme bildirimini gönder",
      openPayment: "eShipX ödeme sayfasını aç",
      opened: "Ödeme sayfası açıldı",
      payerEmail: "eShipX ödemesinde kullandığın e-posta",
      payerEmailHelp: "OnPace e-postandan farklı olabilir. Bu bilgi yalnızca ödemeyi eşleştirmek için kullanılır.",
      confirm: "eShipX ödemesini tamamladım ve yukarıdaki e-posta doğru.",
      submit: "Ödemeyi tamamladım",
      submitting: "Kontrole gönderiliyor…",
      successTitle: "Ödeme bildirimin alındı",
      successText: "Ödeme bildirimin ekibimize iletildi. Teşekkür ederiz; eShipX ödemen doğrulanır doğrulanmaz aboneliğin aktifleştirilecek. Aktivasyon tamamlandığında sana hemen e-posta da göndereceğiz.",
      close: "Tamam",
      pendingTitle: "Ödeme kontrol durumu",
      pendingText: "Bu bildirimler eShipX işlemleriyle manuel olarak eşleştirilir.",
      submitted: "Kontrol bekliyor",
      reviewing: "İnceleniyor",
      approved: "Aktif edildi",
      rejected: "Eşleştirilemedi",
      canceled: "İptal edildi",
      paymentReference: "Ödeme referansı",
      checkoutUnavailable: "Bu paketin eShipX bağlantısı henüz tanımlanmadı.",
      promo: "Promosyon kodu",
      apply: "Uygula",
      discountApplied: "indirim uygulandı",
      providerAmountFinal: "Tahsil edilecek kesin tutar eShipX ekranında gösterilen tutardır. Promosyon avantajı, ödemen eşleştirilirken yönetici tarafından kontrol edilir.",
      noticeError: "Ödeme bildirimi gönderilemedi. Lütfen yeniden deneyin.",
      alreadyPending: "Zaten kontrol bekleyen bir ödeme bildirimin var.",
      networkError: "Ödeme hizmetine ulaşılamadı. Bağlantını kontrol edip yeniden dene.",
    },
    es: {
      secureTitle: "Pago seguro mediante EshipX",
      secureDescription: "OnPace nunca recibe los datos de tu tarjeta. El pago se completa en EshipX y el acceso se activa tras una verificación manual.",
      stepPlan: "1. Comprueba tu plan",
      stepPay: "2. Completa el pago en EshipX",
      stepReturn: "3. Vuelve aquí y envía el aviso de pago",
      openPayment: "Abrir la página de pago de EshipX",
      opened: "Página de pago abierta",
      payerEmail: "Correo usado para pagar en EshipX",
      payerEmailHelp: "Puede ser distinto de tu correo de OnPace. Solo se utiliza para vincular el pago.",
      confirm: "He completado el pago en EshipX y el correo anterior es correcto.",
      submit: "He completado el pago",
      submitting: "Enviando para revisión…",
      successTitle: "Aviso de pago recibido",
      successText: "Tu aviso de pago se ha enviado a nuestro equipo. Gracias; activaremos tu suscripción en cuanto verifiquemos el pago de EshipX y te enviaremos un correo inmediatamente al completarse la activación.",
      close: "Listo",
      pendingTitle: "Estado de revisión del pago",
      pendingText: "Estos avisos se vinculan manualmente con las transacciones de EshipX.",
      submitted: "Pendiente de revisión",
      reviewing: "En revisión",
      approved: "Activado",
      rejected: "No se pudo vincular",
      canceled: "Cancelado",
      paymentReference: "Referencia de pago",
      checkoutUnavailable: "El enlace de EshipX para este plan aún no está configurado.",
      promo: "Código promocional",
      apply: "Aplicar",
      discountApplied: "descuento aplicado",
      providerAmountFinal: "El cargo definitivo es el importe mostrado en EshipX. El administrador comprobará cualquier ventaja promocional al vincular tu pago.",
      noticeError: "No se pudo enviar el aviso de pago. Inténtalo de nuevo.",
      alreadyPending: "Ya tienes un aviso de pago pendiente de revisión.",
      networkError: "No se pudo conectar con el servicio de pago. Comprueba tu conexión e inténtalo de nuevo.",
    },
    zh: {
      secureTitle: "通过 EshipX 安全付款",
      secureDescription: "OnPace 不会接收您的银行卡信息。付款在 EshipX 页面完成，人工核验后才会开通访问权限。",
      stepPlan: "1. 确认套餐",
      stepPay: "2. 在 EshipX 完成付款",
      stepReturn: "3. 返回此页面并提交付款通知",
      openPayment: "打开 EshipX 付款页面",
      opened: "付款页面已打开",
      payerEmail: "EshipX 付款所用邮箱",
      payerEmailHelp: "该邮箱可以与 OnPace 邮箱不同，仅用于匹配付款。",
      confirm: "我已在 EshipX 完成付款，并确认上方邮箱正确。",
      submit: "我已完成付款",
      submitting: "正在提交审核…",
      successTitle: "已收到付款通知",
      successText: "您的付款通知已转交给我们的团队。感谢您；EshipX 付款验证完成后，我们会尽快为您开通会员，并在开通后立即发送邮件。",
      close: "完成",
      pendingTitle: "付款审核状态",
      pendingText: "这些通知将与 EshipX 交易进行人工匹配。",
      submitted: "等待审核",
      reviewing: "正在审核",
      approved: "已激活",
      rejected: "无法匹配",
      canceled: "已取消",
      paymentReference: "付款参考号",
      checkoutUnavailable: "该套餐的 EshipX 链接尚未配置。",
      promo: "优惠码",
      apply: "应用",
      discountApplied: "已应用折扣",
      providerAmountFinal: "最终扣款金额以 EshipX 页面显示为准。管理员会在匹配付款时核对任何优惠权益。",
      noticeError: "付款通知提交失败，请重试。",
      alreadyPending: "您已有一条等待审核的付款通知。",
      networkError: "无法连接付款服务，请检查网络后重试。",
    },
  });

  const paymentFlowCopy = localized({
    en: {
      eyebrow: "EshipX payment process", title: "A clear, manually verified activation flow", description: "Choose your package, complete payment on EshipX, then return with the email used for payment. Your current access stays unchanged until the transaction is matched.",
      choose: "Choose a package", chooseDetail: "Review the billing period and exact plan price.", pay: "Pay on EshipX", payDetail: "Card and bank details remain on EshipX.", notify: "Send payment notice", notifyDetail: "Enter the payer email so the administrator can match it.", verified: "Manually verified", email: "Activation email in your language", open: "Payments available", closed: "Payments currently closed",
    },
    tr: {
      eyebrow: "eShipX ödeme süreci", title: "Açık, kontrollü ve manuel doğrulanan aktivasyon", description: "Paketini seç, ödemeyi eShipX'te tamamla ve ödeme sırasında kullandığın e-postayla bu sayfaya dön. İşlem eşleştirilene kadar mevcut erişimin değişmez.",
      choose: "Paketini seç", chooseDetail: "Ödeme dönemini ve paket tutarını kontrol et.", pay: "eShipX'te öde", payDetail: "Kart ve banka bilgilerin eShipX'te kalır.", notify: "Ödeme bildirimi gönder", notifyDetail: "Yöneticinin eşleştirmesi için ödeme e-postanı gir.", verified: "Manuel doğrulama", email: "Kendi dilinde aktivasyon e-postası", open: "Ödemeler açık", closed: "Ödemeler şu anda kapalı",
    },
    es: {
      eyebrow: "Proceso de pago EshipX", title: "Activación clara y verificada manualmente", description: "Elige un plan, completa el pago en EshipX y vuelve con el correo utilizado. Tu acceso actual no cambia hasta que se vincule la transacción.",
      choose: "Elige un plan", chooseDetail: "Comprueba el periodo y el importe.", pay: "Paga en EshipX", payDetail: "Los datos bancarios permanecen en EshipX.", notify: "Envía el aviso", notifyDetail: "Introduce el correo del pagador para vincularlo.", verified: "Verificación manual", email: "Correo de activación en tu idioma", open: "Pagos disponibles", closed: "Pagos cerrados temporalmente",
    },
    zh: {
      eyebrow: "EshipX 付款流程", title: "清晰且人工核验的开通流程", description: "选择套餐，在 EshipX 完成付款，然后使用付款邮箱返回此页面。在交易匹配完成前，您当前的访问权限不会改变。",
      choose: "选择套餐", chooseDetail: "确认计费周期和套餐金额。", pay: "在 EshipX 付款", payDetail: "银行卡信息始终保留在 EshipX。", notify: "提交付款通知", notifyDetail: "填写付款邮箱，供管理员匹配。", verified: "人工核验", email: "按您的语言发送开通邮件", open: "付款已开放", closed: "付款暂时关闭",
    },
  });

  const configuredPlanName = (plan: string, fallback: string) => {
    const value = systemSettings?.plan_names?.[plan]?.[lang as "en" | "tr" | "es" | "zh"];
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  };

  const plans: BillingPlan[] = [
    {
      title: localized({ en: "Free Plan", tr: "Ücretsiz Plan", es: "Gratis", zh: "免费版" }),
      type: "free",
      cycle: "none",
      price: 0,
      period: localized({ en: "forever", tr: "süresiz", es: "para siempre", zh: "永久" }),
      description: localized({
        en: "Basic tools to track school work.",
        tr: "Derslerini takip etmek için temel araçlar.",
        es: "Funciones básicas para organizar tus estudios.",
        zh: "用于跟踪学业的基础工具。",
      }),
      features: localized({
        en: ["Limited AI usage (5 messages/day)", "Up to 2 courses", "Basic calendar scheduling", "Basic assignment tracking", "Community forum access"],
        tr: ["Sınırlı AI kullanımı (günde 5 mesaj)", "En fazla 2 ders", "Temel takvim planlama", "Temel görev takibi", "Topluluk forumuna erişim"],
        es: ["Uso limitado de IA (5 mensajes/día)", "Hasta 2 asignaturas", "Calendario básico", "Seguimiento básico de tareas", "Acceso al foro comunitario"],
        zh: ["每日限量 AI 提问（5 次）", "最多创建 2 门课程", "基础日历规划", "基础任务跟踪", "学生社区访问"],
      }),
      badge: localized({ en: "Current Plan", tr: "Mevcut Plan", es: "Plan actual", zh: "当前方案" }),
      badgeStyle: "bg-gray-100 text-gray-500",
      cta: localized({ en: "Current Plan", tr: "Mevcut Plan", es: "Plan actual", zh: "当前方案" }),
      disabled: true,
    },
    {
      title: configuredPlanName("pro_monthly", localized({ en: "Pro Monthly", tr: "Pro Aylık", es: "Pro Mensual", zh: "Pro 月订阅" })),
      type: "pro_monthly",
      cycle: "monthly",
      price: Number(systemSettings?.plan_prices?.pro_monthly ?? systemSettings?.plan_prices?.pro ?? 6.99),
      period: localized({ en: "month", tr: "ay", es: "mes", zh: "月" }),
      description: localized({
        en: "Everything you need to master your classes.",
        tr: "Derslerinde ilerlemek için ihtiyaç duyduğun tüm araçlar.",
        es: "Todo lo necesario para dominar tus clases.",
        zh: "掌握课程所需的全部功能。",
      }),
      features: localized({
        en: ["Unlimited AI Study Coach", "Unlimited course notebooks", "AI flashcard generation", "Interactive AI quizzes", "SAT / ACT / AP prep tools", "Advanced study analytics"],
        tr: ["Sınırsız AI Çalışma Koçu", "Sınırsız ders not defteri", "AI bilgi kartı oluşturma", "İnteraktif AI testleri", "SAT / ACT / AP hazırlık araçları", "Gelişmiş çalışma analizleri"],
        es: ["Coach de IA ilimitado", "Cuadernos ilimitados", "Generador de tarjetas con IA", "Cuestionarios interactivos", "Herramientas SAT / ACT / AP", "Analíticas avanzadas"],
        zh: ["无限量 AI 学习教练", "无限量课程笔记本", "AI 知识卡生成", "互动 AI 测验", "SAT / ACT / AP 备考工具", "高级学习分析"],
      }),
      badge: localized({ en: "Popular", tr: "Popüler", es: "Popular", zh: "最受欢迎" }),
      badgeStyle: "bg-brand/10 text-brand border border-brand/20",
      cta: configuredPlanName("pro_monthly", localized({ en: "Upgrade to Pro Monthly", tr: "Pro Aylık'a Geç", es: "Mejorar a Pro Mensual", zh: "升级至 Pro 月度版" })),
      disabled: effectivePlanType === "pro_monthly",
    },
    {
      title: configuredPlanName("pro_yearly", localized({ en: "Pro Yearly", tr: "Pro Yıllık", es: "Pro Anual", zh: "Pro 年订阅" })),
      type: "pro_yearly",
      cycle: "yearly",
      price: Number(systemSettings?.plan_prices?.pro_yearly ?? 59.99),
      period: localized({ en: "year", tr: "yıl", es: "año", zh: "年" }),
      description: localized({
        en: "Complete academic support all year long.",
        tr: "Tüm yıl boyunca kesintisiz akademik destek.",
        es: "Soporte académico completo durante todo el año.",
        zh: "全年持续提供完整学习支持。",
      }),
      features: localized({
        en: ["All Pro Monthly features", "Priority AI processing", "Early access to beta tools", "Better annual value"],
        tr: ["Pro Aylık'taki tüm özellikler", "Öncelikli AI işlem sırası", "Beta araçlarına erken erişim", "Daha avantajlı yıllık fiyat"],
        es: ["Todo lo incluido en Pro Mensual", "Procesamiento prioritario de IA", "Acceso anticipado a betas", "Mejor precio anual"],
        zh: ["包含 Pro 月度版全部功能", "优先 AI 处理", "抢先体验测试功能", "更优惠的年度价格"],
      }),
      badge: localized({ en: "Best Value", tr: "En Avantajlı", es: "Mejor valor", zh: "最佳性价比" }),
      badgeStyle: "bg-accent/15 text-accent border border-accent/20",
      cta: configuredPlanName("pro_yearly", localized({ en: "Upgrade to Pro Yearly", tr: "Pro Yıllık'a Geç", es: "Mejorar a Pro Anual", zh: "升级至 Pro 年度版" })),
      disabled: effectivePlanType === "pro_yearly",
      highlight: true,
    },
    {
      title: configuredPlanName("founding_member", localized({ en: "Founding Member", tr: "Kurucu Üye", es: "Miembro Fundador", zh: "创始会员" })),
      type: "founding_member",
      cycle: "lifetime",
      price: Number(systemSettings?.plan_prices?.founding_member ?? systemSettings?.plan_prices?.founding ?? 99),
      period: localized({ en: "one-time", tr: "tek seferlik", es: "pago único", zh: "一次性" }),
      description: localized({
        en: "Exclusive launch offer with lifetime access.",
        tr: "Ömür boyu erişim sunan özel lansman teklifi.",
        es: "Oferta exclusiva de lanzamiento con acceso de por vida.",
        zh: "提供终身访问权限的专属创始优惠。",
      }),
      features: localized({
        en: ["Lifetime access to Pro features", "Future premium additions", "Founding Member badge", "Direct product feedback", "One-time payment"],
        tr: ["Pro özelliklerine ömür boyu erişim", "Gelecekteki premium eklentiler", "Kurucu Üye rozeti", "Doğrudan ürün geri bildirimi", "Tek seferlik ödeme"],
        es: ["Acceso de por vida a Pro", "Futuras funciones premium", "Insignia de Miembro Fundador", "Canal directo de comentarios", "Pago único"],
        zh: ["终身使用 Pro 功能", "未来高级功能", "创始会员徽章", "直接产品反馈渠道", "一次性付款"],
      }),
      badge: localized({ en: "Limited Time", tr: "Sınırlı Süre", es: "Tiempo limitado", zh: "限时优惠" }),
      badgeStyle: "bg-purple-50 text-purple-600 border border-purple-100",
      cta: configuredPlanName("founding_member", localized({ en: "Become a Founding Member", tr: "Kurucu Üye Ol", es: "Ser Miembro Fundador", zh: "加入创始会员" })),
      disabled: effectivePlanType === "founding_member",
    },
  ];

  const currentAccessTitle = effectivePlanType === "free"
    ? plans[0].title
    : effectivePlanType === "pro_monthly"
      ? plans[1].title
      : effectivePlanType === "pro_yearly"
        ? plans[2].title
        : effectivePlanType === "founding_member"
          ? plans[3].title
          : accessCopy.complimentary;
  const cancellationScheduled = Boolean(
    manualSubscription?.status === "cancel_at_period_end" ||
    profile?.subscription_status === "cancel_at_period_end"
  );
  const currentAccessDetail = effectivePlanType === "free"
    ? accessCopy.freeDetail
    : effectivePlanType === "founding_member"
      ? accessCopy.lifetimeDetail
      : isComplimentaryAccess
        ? accessCopy.complimentaryDetail
        : cancellationScheduled
          ? accessCopy.cancelScheduledDetail
        : accessCopy.recurringDetail;
  const currentAccessDateLabel = isTrialActive && !isComplimentaryAccess
    ? accessCopy.trial
    : isComplimentaryAccess || cancellationScheduled
      ? accessCopy.ends
      : accessCopy.renews;
  const currentAccessDate = isTrialActive && !isComplimentaryAccess
    ? trialEnds
    : effectiveAccessEnds || (profile?.next_billing_date ? new Date(profile.next_billing_date) : null);
  const pendingCancellation = cancellationRequests.find((request) => request.status === "submitted" && request.subscription_id === manualSubscription?.id);
  const cancellationCopy = localized({
    en: { title: "Manage your subscription", detail: "To cancel a recurring plan, send a request to our team. We will review it manually and email you the confirmation.", request: "Request cancellation", waiting: "Your cancellation request is with our team. Your access remains active until the request is reviewed." },
    tr: { title: "Aboneliğini yönet", detail: "Yinelenen paketin için iptal talebi gönderebilirsin. Talebin sonucu e-posta ile iletilir.", request: "İptal talebi gönder", waiting: "İptal talebin alındı. Sonuç bildirilene kadar erişimin devam eder." },
    es: { title: "Gestiona tu suscripción", detail: "Para cancelar un plan recurrente, envía una solicitud a nuestro equipo. La revisaremos manualmente y confirmaremos por correo.", request: "Solicitar cancelación", waiting: "Tu solicitud está con nuestro equipo. Tu acceso sigue activo hasta que se revise." },
    zh: { title: "管理您的订阅", detail: "如需取消续订套餐，请向我们的团队提交请求。我们会人工审核并通过电子邮件确认。", request: "提交取消请求", waiting: "您的取消请求已交给我们的团队。在审核前，您的访问权限仍然有效。" },
  });

  return (
    <main className="mx-auto w-full max-w-[1450px] flex-1 space-y-8 overflow-y-auto p-4 sm:p-6 lg:p-9">
      
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/10"><CreditCard size={23} /></span>
        <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-surface-dark sm:text-3xl">
          {t.billing.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t.billing.subtitle}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 via-white to-accent/10 shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand ring-1 ring-brand/15">
              <ShieldCheck size={23} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand">{accessCopy.eyebrow}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-surface-dark sm:text-2xl">{currentAccessTitle}</h2>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ${cancellationScheduled ? "bg-amber-100 text-amber-800 ring-amber-200" : "bg-emerald-100 text-emerald-700 ring-emerald-200"}`}>
                  {cancellationScheduled ? accessCopy.cancelsAtPeriodEnd : accessCopy.active}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-600 sm:text-sm">{currentAccessDetail}</p>
            </div>
          </div>
          {effectivePlanType === "founding_member" ? (
            <span className="shrink-0 rounded-2xl bg-white/80 px-4 py-3 text-xs font-extrabold text-brand ring-1 ring-brand/15">{accessCopy.lifetime}</span>
          ) : currentAccessDate ? (
            <div className="shrink-0 rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-brand/15 sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand">{currentAccessDateLabel}</p>
              <p className="mt-1 text-xs font-extrabold text-surface-dark">
                {currentAccessDate.toLocaleString(dateLocale, { timeZone: profile?.timezone || undefined, timeZoneName: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {manualHasAccess && manualSubscription?.billing_cycle !== "one_time" && (
        <section className="flex flex-col gap-4 rounded-3xl border border-brand/15 bg-brand/5 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-surface-dark">{cancellationCopy.title}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-600">{pendingCancellation ? cancellationCopy.waiting : cancellationCopy.detail}</p>
          </div>
          {pendingCancellation ? (
            <span className="shrink-0 rounded-xl bg-amber-100 px-4 py-2.5 text-xs font-bold text-amber-800">{cancellationCopy.waiting}</span>
          ) : (
            <button type="button" onClick={() => setCancellationConfirmOpen(true)} disabled={requestingCancellation} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand/25 bg-white px-4 py-3 text-xs font-extrabold text-brand shadow-sm transition hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-60">
              {requestingCancellation && <Loader2 size={15} className="animate-spin" />}{cancellationCopy.request}
            </button>
          )}
        </section>
      )}

      <section className="rounded-[2rem] border border-gray-150 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">{paymentFlowCopy.eyebrow}</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-surface-dark sm:text-2xl">{paymentFlowCopy.title}</h2>
            <p className="mt-2 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">{paymentFlowCopy.description}</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-[10px] font-extrabold ring-1 ${systemSettings?.payment_gateway_enabled ? "bg-indigo-50 text-indigo-700 ring-indigo-100" : "bg-gray-100 text-gray-600 ring-gray-200"}`}>
            <span className={`h-2 w-2 rounded-full ${systemSettings?.payment_gateway_enabled ? "bg-emerald-500" : "bg-gray-400"}`} />
            {systemSettings?.payment_gateway_enabled ? paymentFlowCopy.open : paymentFlowCopy.closed}
          </span>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          {[
            { icon: CreditCard, title: paymentFlowCopy.choose, detail: paymentFlowCopy.chooseDetail },
            { icon: ExternalLink, title: paymentFlowCopy.pay, detail: paymentFlowCopy.payDetail },
            { icon: ReceiptText, title: paymentFlowCopy.notify, detail: paymentFlowCopy.notifyDetail },
          ].map(({ icon: Icon, title, detail }, index) => (
            <div key={title} className="contents">
              <article className="flex min-h-28 items-start gap-3 rounded-2xl border border-gray-150 bg-slate-50/60 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm ring-1 ring-gray-100"><Icon size={17} /></span>
                <div><p className="text-[10px] font-black uppercase tracking-wider text-gray-400">0{index + 1}</p><h3 className="mt-1 text-sm font-extrabold text-surface-dark">{title}</h3><p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p></div>
              </article>
              {index < 2 && <ArrowRight className="mx-auto hidden text-gray-300 lg:block" size={18} />}
            </div>
          ))}
        </div>
      </section>

      {paymentClaims.length > 0 && (
        <section className="rounded-3xl border border-amber-150 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-amber-50 p-2.5 text-amber-700"><Clock3 size={20} /></span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-surface-dark">{claimCopy.pendingTitle}</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">{claimCopy.pendingText}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {paymentClaims.slice(0, 4).map((claim) => {
              const subscriptionStatus = claim.manual_subscriptions?.status;
              const statusText = subscriptionStatus === "cancel_at_period_end"
                ? accessCopy.cancelsAtPeriodEnd
                : subscriptionStatus === "canceled"
                  ? accessCopy.canceled
                  : claimCopy[claim.status as keyof typeof claimCopy] || claim.status;
              const statusClass = subscriptionStatus === "cancel_at_period_end"
                ? "bg-amber-50 text-amber-800"
                : subscriptionStatus === "canceled" || claim.status === "rejected" || claim.status === "canceled"
                  ? "bg-red-50 text-red-700"
                  : claim.status === "approved"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700";
              return (
                <article key={claim.id} className="rounded-2xl border border-gray-150 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-surface-dark">{claim.plan_type === "pro_monthly" ? plans[1].title : claim.plan_type === "pro_yearly" ? plans[2].title : plans[3].title}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{claim.payer_email}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass}`}>{statusText}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-gray-700">{claim.quoted_amount} {claim.currency}</span>
                    <span className="text-gray-400">{new Date(claim.submitted_at).toLocaleDateString(dateLocale)}</span>
                  </div>
                  {claim.provider_reference && <p className="mt-2 break-all text-[10px] text-gray-500">{claimCopy.paymentReference}: <span className="font-mono font-bold">{claim.provider_reference}</span></p>}
                  {subscriptionStatus === "cancel_at_period_end" && claim.manual_subscriptions?.cancellation_effective_at && (
                    <p className="mt-2 text-[10px] font-semibold text-amber-800">{accessCopy.ends}: {new Date(claim.manual_subscriptions.cancellation_effective_at).toLocaleDateString(dateLocale)}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {profile?.plan === "free" && profile?.subscription_status === "expired" && (
        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-800 text-sm">{t.billing.trialExpired || "Your Free Trial Has Expired"}</h3>
            <p className="text-xs text-red-700 mt-1">{t.billing.trialExpiredDesc || "Your account was downgraded to the Free tier. Please choose a plan below to continue studying."}</p>
          </div>
        </div>
      )}

      {/* Pricing Matrix Cards */}
      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p, idx) => {
          const isCurrent = p.type === effectivePlanType;

          return (
            <div
              key={idx}
              className={`bg-white border rounded-3xl p-6 flex flex-col justify-between relative transition-all shadow-sm ${
                p.highlight ? "border-brand ring-2 ring-brand/10 md:scale-[1.02]" : "border-gray-150 hover:border-gray-200"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${p.badgeStyle}`}>
                    {isCurrent ? localized({ en: "Active Plan", tr: "Aktif Plan", es: "Plan activo", zh: "正在使用方案" }) : p.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-surface-dark">{p.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{p.description}</p>
                </div>

                <div className="flex items-baseline">
                  <span className="text-3xl font-extrabold text-surface-dark">${p.price}</span>
                  <span className="text-xs text-gray-400 ml-1">/ {p.period}</span>
                </div>

                <ul className="space-y-2.5 pt-4 border-t border-gray-100">
                  {p.features.map((feat, fidx) => (
                    <li key={fidx} className="flex items-start gap-2 text-xs text-gray-600 font-medium">
                      <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6">
                <button
                  disabled={isCurrent || p.disabled}
                  onClick={() => handleOpenCheckout(p)}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    isCurrent
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : p.highlight
                      ? "bg-brand text-white hover:bg-brand-hover shadow-sm"
                      : "bg-white border border-gray-200 hover:border-brand text-gray-700 hover:text-brand"
                  }`}
                >
                  {isCurrent ? localized({ en: "Active", tr: "Aktif", es: "Activo", zh: "激活" }) : p.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EshipX hosted payment and manual matching handoff */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dark/55 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-300">EshipX · OnPace</span>
                  <h3 className="mt-2 text-xl font-extrabold">{claimCopy.secureTitle}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-300">{claimCopy.secureDescription}</p>
                </div>
                <button type="button" onClick={() => setSelectedPlan(null)} className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20">{t.common.close}</button>
              </div>
            </div>

            {claimSuccess ? (
              <div className="overflow-y-auto p-6 text-center sm:p-8">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={28} /></span>
                <h4 className="mt-4 text-lg font-extrabold text-surface-dark">{claimCopy.successTitle}</h4>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">{claimCopy.successText}</p>
                <button type="button" onClick={() => setSelectedPlan(null)} className="mt-6 w-full rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white sm:w-auto">{claimCopy.close}</button>
              </div>
            ) : (
              <div className="overflow-y-auto p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[claimCopy.stepPlan, claimCopy.stepPay, claimCopy.stepReturn].map((step, index) => (
                    <div key={step} className={`rounded-2xl border p-3 text-xs font-bold leading-5 ${index === 1 && checkoutOpened ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-150 bg-slate-50 text-gray-600"}`}>
                      {step}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{t.billing.selectedPlan}</p>
                    <p className="mt-1 text-sm font-extrabold text-surface-dark">{selectedPlan.title}</p>
                  </div>
                  <div className="sm:text-right">
                    {discountPercent > 0 && <p className="text-xs text-gray-400 line-through">${selectedPlan.price}</p>}
                    <p className="text-2xl font-extrabold text-brand">${discountPercent > 0 ? parseFloat((selectedPlan.price * (1 - discountPercent / 100)).toFixed(2)) : selectedPlan.price}</p>
                    {discountPercent > 0 && <span className="text-[10px] font-bold text-emerald-700">%{discountPercent} {claimCopy.discountApplied}</span>}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-150 p-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{claimCopy.promo}</label>
                  <div className="mt-1.5 flex gap-2">
                    <input value={promoCode} onChange={(event) => { setPromoCode(event.target.value); setPromoError(null); setPromoSuccessMsg(null); }} placeholder="TRIAL30" className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-brand" />
                    <button type="button" onClick={handleApplyPromo} disabled={applyingPromo || !promoCode.trim()} className="inline-flex min-w-20 items-center justify-center rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-bold text-gray-700 disabled:opacity-40">{applyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : claimCopy.apply}</button>
                  </div>
                  {promoError && <p className="mt-1.5 text-[10px] font-semibold text-red-600">{promoError}</p>}
                  {promoSuccessMsg && <p className="mt-1.5 text-[10px] font-bold text-emerald-600">{promoSuccessMsg}</p>}
                </div>

                <form onSubmit={handleCheckout} className="mt-4">
                  <button disabled={checkingOut} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-hover disabled:opacity-50">
                    {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink size={16} />}
                    {checkingOut ? t.billing.processing : checkoutOpened ? claimCopy.opened : claimCopy.openPayment}
                  </button>
                  <p className="mt-2 text-center text-[10px] font-medium leading-4 text-gray-500">{claimCopy.providerAmountFinal}</p>
                </form>

                <form onSubmit={handleSubmitPaymentClaim} className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                  <label className="block text-xs font-bold text-gray-700">
                    <span className="flex items-center gap-1.5"><Mail size={14} className="text-brand" />{claimCopy.payerEmail}</span>
                    <input required type="email" autoComplete="email" value={payerEmail} onChange={(event) => setPayerEmail(event.target.value)} placeholder="name@example.com" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
                    <span className="mt-1.5 block text-[10px] font-medium leading-4 text-gray-400">{claimCopy.payerEmailHelp}</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-gray-600">
                    <input type="checkbox" checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-brand" />
                    <span>{claimCopy.confirm}</span>
                  </label>
                  <button disabled={submittingClaim || !paymentConfirmed || !payerEmail.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
                    {submittingClaim ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
                    {submittingClaim ? claimCopy.submitting : claimCopy.submit}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices Purchase History */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-surface-dark flex items-center gap-2">
          <Calendar className="text-brand" size={18} /> {t.billing.invoiceTitle}
        </h2>
        
        {invoices.length === 0 ? (
          <p className="text-xs text-gray-400 py-4">{t.billing.noInvoices}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">{t.billing.tableDate}</th>
                  <th className="py-3 px-4">{t.billing.tableIntent}</th>
                  <th className="py-3 px-4">{t.billing.tablePlan}</th>
                  <th className="py-3 px-4">{t.billing.tableCycle}</th>
                  <th className="py-3 px-4">{t.billing.tablePrice}</th>
                  <th className="py-3 px-4">{t.billing.tableStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="text-gray-700 hover:bg-gray-50 transition-all">
                    <td className="py-3.5 px-4 font-medium">{new Date(inv.created_at).toLocaleDateString(dateLocale)}</td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-gray-400">
                      {inv.provider_reference || inv.stripe_payment_intent_id || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      {inv.plan_type === "pro_monthly"
                        ? localized({ en: "Pro Monthly", tr: "Pro Aylık", es: "Pro Mensual", zh: "Pro 月订阅" })
                        : inv.plan_type === "pro_yearly"
                          ? localized({ en: "Pro Yearly", tr: "Pro Yıllık", es: "Pro Anual", zh: "Pro 年订阅" })
                          : localized({ en: "Founding Member", tr: "Kurucu Üye", es: "Miembro Fundador", zh: "创始会员" })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-400">{inv.billing_cycle}</td>
                    <td className="py-3.5 px-4 font-extrabold text-surface-dark">${inv.amount}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-150 uppercase">
                        {localized({ en: "Paid", tr: "Ödendi", es: "Pagado", zh: "已付款" })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Alert Modal Dialog */}
      {customAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 relative border border-gray-100 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-brand-light text-brand flex items-center justify-center mx-auto shadow-sm">
              <HelpCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-surface-dark">
                {t.billing.noticeTitle}
              </h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
            >
              {t.billing.dismiss}
            </button>
          </div>
        </div>
      )}

      {cancellationConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-brand/15 bg-white p-6 shadow-2xl sm:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"><HelpCircle size={21} /></span>
            <h3 className="mt-4 text-lg font-extrabold text-surface-dark">{localized({ en: "Confirm cancellation request", tr: "İptal talebini onayla", es: "Confirmar solicitud de cancelación", zh: "确认取消请求" })}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">{localized({ en: "Do you want to send your cancellation request? Your current access will remain available until the result is confirmed.", tr: "İptal talebini göndermek istiyor musun? Sonuç bildirilene kadar mevcut erişimin devam eder.", es: "¿Deseas enviar la solicitud de cancelación? Tu acceso actual seguirá disponible hasta que se confirme el resultado.", zh: "确定要发送取消请求吗？在确认结果前，您当前的访问权限将继续有效。" })}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setCancellationConfirmOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100">{localized({ en: "Keep subscription", tr: "Vazgeç", es: "Mantener suscripción", zh: "保留订阅" })}</button><button type="button" onClick={handleRequestCancellation} disabled={requestingCancellation} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white hover:bg-brand-hover disabled:opacity-60">{requestingCancellation && <Loader2 size={15} className="animate-spin" />}{localized({ en: "Send request", tr: "Talebi gönder", es: "Enviar solicitud", zh: "发送请求" })}</button></div>
          </div>
        </div>
      )}

    </main>
  );
}
