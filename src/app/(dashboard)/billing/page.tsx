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

  // Provider-hosted checkout state
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

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
    } else if (!systemSettings?.payment_provider_configured) {
      setCustomAlert(t.billing.providerNotConfigured);
    } else {
      const dynamicPrice = systemSettings?.plan_prices?.[plan.type] ?? plan.price;
      setSelectedPlan({ ...plan, price: dynamicPrice });
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setCheckingOut(true);

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
        window.location.assign(data.checkoutUrl);
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

  const localized = <T,>(values: { en: T; tr: T; es: T; zh: T }): T =>
    values[(["en", "tr", "es", "zh"].includes(lang) ? lang : "en") as keyof typeof values];

  const plans = [
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
      title: localized({ en: "Pro Monthly", tr: "Pro Aylık", es: "Pro Mensual", zh: "Pro 月订阅" }),
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
      cta: localized({ en: "Upgrade to Pro Monthly", tr: "Pro Aylık'a Geç", es: "Mejorar a Pro Mensual", zh: "升级至 Pro 月度版" }),
      disabled: profile?.plan === "pro" && profile?.billing_cycle === "monthly",
    },
    {
      title: localized({ en: "Pro Yearly", tr: "Pro Yıllık", es: "Pro Anual", zh: "Pro 年订阅" }),
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
      cta: localized({ en: "Upgrade to Pro Yearly", tr: "Pro Yıllık'a Geç", es: "Mejorar a Pro Anual", zh: "升级至 Pro 年度版" }),
      disabled: profile?.plan === "pro" && profile?.billing_cycle === "yearly",
      highlight: true,
    },
    {
      title: localized({ en: "Founding Member", tr: "Kurucu Üye", es: "Miembro Fundador", zh: "创始会员" }),
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
      cta: localized({ en: "Become a Founding Member", tr: "Kurucu Üye Ol", es: "Ser Miembro Fundador", zh: "加入创始会员" }),
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

      {/* PCI-compliant provider-hosted checkout handoff */}
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
            <form onSubmit={handleCheckout} className="p-6 space-y-4">
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

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-brand/10 bg-brand/5 p-4 text-xs leading-relaxed text-gray-600">
                      {t.billing.hostedCheckoutNotice}
                    </div>
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

                  </div>

                  <button
                    type="submit"
                    disabled={checkingOut}
                    className="w-full py-3.5 mt-4 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-hover active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck size={14} />}
                    {checkingOut ? t.billing.processing : `${t.billing.continueToPayment} $${selectedPlan.price}`}
                  </button>
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
