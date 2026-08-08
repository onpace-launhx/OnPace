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
};
type BillingProfile = {
  id: string;
  email?: string | null;
  language?: string | null;
  plan?: string | null;
  billing_cycle?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  timezone?: string | null;
  discount_percent?: number | null;
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Provider-hosted checkout state
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentClaims, setPaymentClaims] = useState<PaymentClaim[]>([]);
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

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

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
        const claimsResponse = await fetch("/api/billing/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "my_payment_claims" }),
        });
        const claimsData = await claimsResponse.json().catch(() => ({}));
        if (claimsResponse.ok) setPaymentClaims(claimsData.claims || []);
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

  // Calculate remaining trial days
  const now = new Date();
  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnds && trialEnds > now;
  const discountPercent = Math.max(0, Math.min(100, Number(profile?.discount_percent) || 0));
  let trialDaysRemaining = 0;
  if (trialEnds && isTrialActive) {
    const diffTime = Math.abs(trialEnds.getTime() - now.getTime());
    trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const localized = <T,>(values: { en: T; tr: T; es: T; zh: T }): T =>
    values[(["en", "tr", "es", "zh"].includes(lang) ? lang : "en") as keyof typeof values];
  const dateLocale = localized({
    en: "en-US",
    tr: "tr-TR",
    es: "es-ES",
    zh: "zh-CN",
  });
  const paymentCopy = localized({
    en: {
      title: "Secure credit and debit card payments",
      description: "Checkout is completed on the configured payment provider’s PCI-compliant page. Available card networks and debit-card support are confirmed there before payment.",
      networks: "Credit cards · Debit cards · Supported networks shown at checkout",
      expires: "Expires",
      trialRecurring: "Full Pro access is active for {days} more days. Your selected recurring plan begins when the free period ends unless it is canceled.",
      trialComplimentary: "You have {days} more days of complimentary Pro access. No payment will be collected for this access period.",
    },
    tr: {
      title: "Güvenli kredi ve banka kartı ödemeleri",
      description: "Ödeme, yapılandırılmış ödeme sağlayıcısının PCI uyumlu sayfasında tamamlanır. Desteklenen kart ağları ve banka kartları ödeme öncesinde orada gösterilir.",
      networks: "Kredi kartları · Banka kartları · Desteklenen ağlar ödeme ekranında",
      expires: "Bitiş",
      trialRecurring: "Tam Pro erişiminiz {days} gün daha aktif. İptal edilmezse seçtiğiniz yinelenen paket ücretsiz süre bittiğinde başlar.",
      trialComplimentary: "Ücretsiz Pro erişiminizin bitmesine {days} gün kaldı. Bu erişim süresi için ödeme alınmaz.",
    },
    es: {
      title: "Pagos seguros con tarjeta de crédito y débito",
      description: "El pago se completa en la página PCI del proveedor configurado. Allí se muestran las redes y tarjetas de débito compatibles antes de pagar.",
      networks: "Crédito · Débito · Redes compatibles visibles al pagar",
      expires: "Caduca",
      trialRecurring: "Tu acceso Pro completo seguirá activo {days} días. El plan recurrente elegido comenzará al terminar el periodo gratuito, salvo que se cancele.",
      trialComplimentary: "Te quedan {days} días de acceso Pro gratuito. No se realizará ningún cobro por este periodo.",
    },
    zh: {
      title: "安全的信用卡与借记卡支付",
      description: "付款将在已配置服务商的 PCI 合规页面完成，支持的卡组织和借记卡会在付款前显示。",
      networks: "信用卡 · 借记卡 · 支持的卡组织将在结账页显示",
      expires: "到期",
      trialRecurring: "完整 Pro 权限还剩 {days} 天。若未取消，所选周期套餐将在免费期结束后开始。",
      trialComplimentary: "免费 Pro 权限还剩 {days} 天，此期间不会收取费用。",
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
      successText: "Your access will remain unchanged until an administrator matches the payment reference. We will email you when the plan is activated.",
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
      successText: "Yönetici ödeme referansını eşleştirene kadar erişimin değişmez. Paket açıldığında sana e-posta göndereceğiz.",
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
      successText: "Tu acceso no cambiará hasta que un administrador vincule la referencia. Te enviaremos un correo cuando se active.",
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
      successText: "管理员匹配付款参考号前，您的访问权限不会改变。套餐开通后我们会发送邮件。",
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
      disabled: profile?.plan === "pro" && profile?.billing_cycle === "monthly",
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
      disabled: profile?.plan === "pro" && profile?.billing_cycle === "yearly",
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
      disabled: profile?.plan === "founding",
    },
  ];

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto space-y-8 max-w-6xl mx-auto w-full">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-surface-dark flex items-center gap-2">
          <CreditCard className="text-brand" /> {t.billing.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t.billing.subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
          <ShieldCheck size={21} />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-emerald-900">{paymentCopy.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800">{paymentCopy.description}</p>
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{paymentCopy.networks}</p>
        </div>
      </div>

      {/* Trial and Subscription Banner */}
      {isTrialActive && (
        <div className="bg-gradient-to-r from-brand to-brand-dark p-6 rounded-3xl text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-lg">{t.billing.trialActive || "You are on Pro Free Trial!"}</h3>
            <p className="text-sm opacity-90 mt-1">
              {(profile?.billing_cycle === "monthly" || profile?.billing_cycle === "yearly" ? paymentCopy.trialRecurring : paymentCopy.trialComplimentary).replace("{days}", String(trialDaysRemaining))}
            </p>
          </div>
          <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold shrink-0">
            {paymentCopy.expires}: {trialEnds?.toLocaleString(dateLocale, { timeZone: profile?.timezone || undefined, timeZoneName: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}

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
              const statusText = claimCopy[claim.status as keyof typeof claimCopy] || claim.status;
              const statusClass = claim.status === "approved" ? "bg-emerald-50 text-emerald-700" : claim.status === "rejected" || claim.status === "canceled" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {plans.map((p, idx) => {
          const isCurrent = (p.type === "free" && profile?.plan === "free" && !isTrialActive) ||
                            (p.type === "pro_monthly" && profile?.plan === "pro" && profile?.billing_cycle === "monthly") ||
                            (p.type === "pro_yearly" && profile?.plan === "pro" && profile?.billing_cycle === "yearly") ||
                            (p.type === "founding_member" && profile?.plan === "founding");

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

    </main>
  );
}
