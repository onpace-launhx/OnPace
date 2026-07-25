"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Check,
  ShieldCheck,
  Sparkles,
  Trophy,
  Loader2,
  Lock,
  Calendar,
  DollarSign,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { getTranslations } from "@/lib/translations";

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stripe Simulation Checkout Modal States
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/29");
  const [cardCvc, setCardCvc] = useState("424");
  const [zipCode, setZipCode] = useState("34000");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

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

  const [systemSettings, setSystemSettings] = useState<any>(null);

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
      const { data: sysData } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
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

      setLoading(false);
    }
    loadBillingData();
  }, [router, supabase]);

  const handleOpenCheckout = (plan: any) => {
    if (!systemSettings?.payment_gateway_enabled) {
      const disabledMsg =
        systemSettings?.payment_disabled_message?.[lang] ||
        systemSettings?.payment_disabled_message?.en ||
        (lang === "tr"
          ? "Plan değişikliği yalnızca size verilen promocode üzerinden veya sistem yöneticiniz tarafından yapılabilir."
          : "Plan changes can only be made using a promo code issued to you or by your system administrator.");
      setCustomAlert(disabledMsg);
    } else {
      const dynamicPrice = systemSettings?.plan_prices?.[plan.type] ?? plan.price;
      setSelectedPlan({ ...plan, price: dynamicPrice });
    }
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setCheckingOut(true);

    const discount = profile?.discount_percent || 0;
    const finalAmount = discount > 0 ? parseFloat((selectedPlan.price * (1 - discount / 100)).toFixed(2)) : selectedPlan.price;

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_type: selectedPlan.type,
          billing_cycle: selectedPlan.cycle,
          amount: finalAmount
        })
      });

      const data = await response.json();

      if (data.success) {
        setCheckoutSuccess(true);
        setTimeout(() => {
          setSelectedPlan(null);
          // Refresh billing page data
          window.location.reload();
        }, 2000);
      } else {
        setCustomAlert(data.error || "Checkout error.");
      }
    } catch {
      setCustomAlert("Network error.");
    }
    setCheckingOut(false);
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
  const isPro = profile?.plan === "pro" || profile?.plan === "founding" || isTrialActive;

  let trialDaysRemaining = 0;
  if (trialEnds && isTrialActive) {
    const diffTime = Math.abs(trialEnds.getTime() - now.getTime());
    trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const plans = [
    {
      title: lang === "zh" ? "免费版" : lang === "es" ? "Gratis" : "Free Plan",
      type: "free",
      cycle: "none",
      price: 0,
      period: lang === "zh" ? "永久" : lang === "es" ? "para siempre" : "forever",
      description: lang === "zh" ? "基础跟踪和日常练习管理工具。" : lang === "es" ? "Funciones básicas para seguimiento." : "Basic features to track school work.",
      features: lang === "zh" ? [
        "每日限量 AI 提问 (5次)",
        "最多创建 2 门学科",
        "基础日程及作业管理",
        "基础日历大纲",
        "学生社区公共版块"
      ] : lang === "es" ? [
        "Uso limitado de IA (5 msgs/día)",
        "Hasta 2 asignaturas",
        "Calendario básico",
        "Seguimiento básico de tareas",
        "Acceso a foro comunitario"
      ] : [
        "Limited AI usage (5 msgs/day)",
        "Up to 2 courses",
        "Basic calendar scheduling",
        "Basic assignment tracking",
        "Community forum access"
      ],
      badge: lang === "zh" ? "当前方案" : lang === "es" ? "Plan Actual" : "Current Plan",
      badgeStyle: "bg-gray-100 text-gray-500",
      cta: lang === "zh" ? "当前方案" : lang === "es" ? "Plan Actual" : "Current Plan",
      disabled: true
    },
    {
      title: lang === "zh" ? "Pro 月订阅" : lang === "es" ? "Pro Mensual" : "Pro Monthly",
      type: "pro_monthly",
      cycle: "monthly",
      price: 6.99,
      period: lang === "zh" ? "月" : lang === "es" ? "mes" : "month",
      description: lang === "zh" ? "开启所有高级人工智能及定制学科支持。" : lang === "es" ? "Todo lo necesario para tus clases." : "Everything you need to master your classes.",
      features: lang === "zh" ? [
        "无限量 AI 智能学科教练",
        "无限量创建课程笔记本",
        "AI 知识闪卡自动生成",
        "AI 章节互动自测模拟题",
        "SAT / ACT / AP 考前特训",
        "高阶学习数据统计与分析"
      ] : lang === "es" ? [
        "Asesor de IA ilimitado",
        "Notebooks de cursos ilimitados",
        "Generador de tarjetas flash",
        "Cuestionarios interactivos de IA",
        "Herramientas SAT / ACT / AP",
        "Analíticas avanzadas de estudio"
      ] : [
        "Unlimited AI Study Coach",
        "Unlimited Course Notebooks",
        "Study Flashcards Generator",
        "Interactive Practice Quizzes",
        "SAT / ACT / AP Prep tools",
        "Advanced Study Analytics"
      ],
      badge: lang === "zh" ? "最受欢迎" : lang === "es" ? "Popular" : "Popular",
      badgeStyle: "bg-brand/10 text-brand border border-brand/20",
      cta: lang === "zh" ? "升级至 Pro 月度版" : lang === "es" ? "Mejorar a Pro Mensual" : "Upgrade to Pro Monthly",
      disabled: profile?.plan === "pro" && profile?.billing_cycle === "monthly"
    },
    {
      title: lang === "zh" ? "Pro 年订阅" : lang === "es" ? "Pro Anual" : "Pro Yearly",
      type: "pro_yearly",
      cycle: "yearly",
      price: 59.99,
      period: lang === "zh" ? "年" : lang === "es" ? "año" : "year",
      description: lang === "zh" ? "全学年无间断学业冲刺支持。" : lang === "es" ? "Soporte completo para todo el año." : "Complete academic support all year long.",
      features: lang === "zh" ? [
        "包含 Pro 月度版所有高级功能",
        "高优 AI 服务器专线通道",
        "抢先体验未来全新 Beta 工具",
        "立省 $24 (比按月付更划算！)"
      ] : lang === "es" ? [
        "Todo lo incluido en Pro Mensual",
        "Prioridad de respuesta de IA",
        "Acceso temprano a betas",
        "Ahorra $24 al año (¡Recomendado!)"
      ] : [
        "All Pro Monthly features",
        "Priority AI server routing",
        "Beta feature early access",
        "Save $24 / year (Best Value!)"
      ],
      badge: lang === "zh" ? "最佳性价比" : lang === "es" ? "Mejor Valor" : "Best Value",
      badgeStyle: "bg-accent/15 text-accent border border-accent/20",
      cta: lang === "zh" ? "升级至 Pro 年度版" : lang === "es" ? "Mejorar a Pro Anual" : "Upgrade to Pro Yearly",
      disabled: profile?.plan === "pro" && profile?.billing_cycle === "yearly",
      highlight: true
    },
    {
      title: lang === "zh" ? "创始会员 (限时)" : lang === "es" ? "Miembro Fundador" : "Founding Member",
      type: "founding_member",
      cycle: "lifetime",
      price: 99.00,
      period: lang === "zh" ? "一次性" : lang === "es" ? "pago único" : "one-time",
      description: lang === "zh" ? "创始阶段特惠，终身免费享有未来所有升级。" : lang === "es" ? "Oferta de lanzamiento. Acceso de por vida." : "Exclusive launch offer. Lifetime access.",
      features: lang === "zh" ? [
        "终身免费使用未来所有 Pro 工具",
        "免费获得未来新增的所有付费包",
        "主页专属“创始会员”闪耀勋章",
        "尊享与开发团队直接反馈特权",
        "一次性付款 - 终身免收年费"
      ] : lang === "es" ? [
        "Acceso de por vida a todo lo Pro",
        "Adiciones premium futuras gratis",
        "Insignia de Miembro Fundador",
        "Línea de comentarios de devs",
        "Pago único: no vuelvas a pagar"
      ] : [
        "Lifetime access to all Pro features",
        "Free future premium add-ons",
        "Founding Member badge on profile",
        "Direct feedback line to developers",
        "One-time charge - never pay again"
      ],
      badge: lang === "zh" ? "限时抢购" : lang === "es" ? "Tiempo Limitado" : "Limited Time",
      badgeStyle: "bg-purple-50 text-purple-600 border border-purple-100",
      cta: lang === "zh" ? "加入创始会员" : lang === "es" ? "Ser Miembro Fundador" : "Become a Founding Member",
      disabled: profile?.plan === "founding"
    }
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

      {/* Trial and Subscription Banner */}
      {isTrialActive && (
        <div className="bg-gradient-to-r from-brand to-brand-dark p-6 rounded-3xl text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-lg">{t.billing.trialActive || "You are on Pro Free Trial!"}</h3>
            <p className="text-sm opacity-90 mt-1">
              {(t.billing.trialDaysLeft || "You have {days} days remaining of full Pro tier access. No charge will be made unless you subscribe.").replace("{days}", String(trialDaysRemaining))}
            </p>
          </div>
          <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold shrink-0">
            Expires: {trialEnds?.toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Locked message if expired */}
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
                    {isCurrent ? (lang === "zh" ? "正在使用方案" : lang === "es" ? "Plan Activo" : "Active Plan") : p.badge}
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
                  {isCurrent ? (lang === "zh" ? "激活" : lang === "es" ? "Activo" : "Active") : p.cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stripe Mock Checkout Modal (Simulated overlay) */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-surface-dark/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-lg border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-surface-dark text-white p-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold tracking-widest uppercase text-brand">{t.billing.checkoutHeader}</span>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-gray-400 hover:text-white transition-all cursor-pointer text-sm font-bold"
                >
                  {t.common.close}
                </button>
              </div>
              <h3 className="text-lg font-bold">OnPace Premium</h3>
              <p className="text-xs text-gray-300">{t.billing.checkoutSub}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSimulatePayment} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">{t.billing.selectedPlan}</p>
                  <p className="text-sm font-bold text-surface-dark mt-0.5">{selectedPlan.title}</p>
                </div>
                <div className="text-right">
                  {profile?.discount_percent > 0 ? (
                    <>
                      <p className="text-xs text-gray-400 line-through">${selectedPlan.price}</p>
                      <p className="text-xl font-extrabold text-brand">
                        ${parseFloat((selectedPlan.price * (1 - profile.discount_percent / 100)).toFixed(2))}
                      </p>
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                        {profile.discount_percent}% Off Applied
                      </span>
                    </>
                  ) : (
                    <p className="text-xl font-extrabold text-surface-dark">${selectedPlan.price}</p>
                  )}
                </div>
              </div>

              {checkoutSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-green-50 text-green-500 border border-green-200 flex items-center justify-center mx-auto animate-pulse">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-green-700">{t.billing.success}</h4>
                    <p className="text-xs text-gray-400 mt-1">Applying credentials & updating subscription...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.billing.cardholder}</label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.billing.cardDetails}</label>
                      <div className="relative mt-1.5">
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          className="block w-full px-3 py-2.5 pr-20 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                        />
                        <span className="absolute right-2.5 top-2.5 text-[9px] font-extrabold text-brand tracking-widest uppercase border border-brand/20 px-1.5 py-0.5 rounded bg-brand/5">Visa</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.billing.expDate}</label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.billing.cvc}</label>
                        <input
                          type="text"
                          required
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="424"
                          className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                        />
                      </div>
                    </div>

                    {/* Promo Code Input */}
                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Promo Code</label>
                      <div className="flex gap-2 mt-1.5">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            setPromoError(null);
                            setPromoSuccessMsg(null);
                          }}
                          placeholder="TRIAL30"
                          className="block flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromo}
                          disabled={applyingPromo || !promoCode.trim()}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[60px]"
                        >
                          {applyingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-[9px] text-red-500 font-semibold mt-1">{promoError}</p>
                      )}
                      {promoSuccessMsg && (
                        <p className="text-[9px] text-green-500 font-bold mt-1">{promoSuccessMsg}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.billing.zip}</label>
                      <input
                        type="text"
                        required
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="34000"
                        className="block w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand text-surface-dark bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={checkingOut}
                    className="w-full py-3.5 mt-4 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck size={14} />}
                    {checkingOut ? t.billing.processing : (lang === "zh" ? "模拟支付" : lang === "es" ? "Pagar" : "Pay") + " $" + selectedPlan.price}
                  </button>
                </>
              )}
            </form>
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
                    <td className="py-3.5 px-4 font-medium">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-gray-400">{inv.stripe_payment_intent_id}</td>
                    <td className="py-3.5 px-4 font-bold">
                      {inv.plan_type === "pro_monthly" ? (lang === "zh" ? "Pro 月订阅" : lang === "es" ? "Pro Mensual" : "Pro Monthly") : inv.plan_type === "pro_yearly" ? (lang === "zh" ? "Pro 年订阅" : lang === "es" ? "Pro Anual" : "Pro Yearly") : (lang === "zh" ? "创始会员" : lang === "es" ? "Miembro Fundador" : "Founding Member")}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-400">{inv.billing_cycle}</td>
                    <td className="py-3.5 px-4 font-extrabold text-surface-dark">${inv.amount}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-150 uppercase">
                        {lang === "zh" ? "已付款" : lang === "es" ? "Pagado" : "Paid"}
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
              <h4 className="text-sm font-bold text-surface-dark">{lang === "zh" ? "支付提示" : lang === "es" ? "Aviso" : "Notification"}</h4>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{customAlert}</p>
            </div>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover active:scale-95 transition-all cursor-pointer"
            >
              {lang === "zh" ? "好的" : lang === "es" ? "Entendido" : "Dismiss"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
