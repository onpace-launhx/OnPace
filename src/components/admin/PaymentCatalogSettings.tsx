"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Save, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Language = "en" | "tr" | "es" | "zh";
type PlanKey = "pro_monthly" | "pro_yearly" | "founding_member";
type LocalizedNames = Record<PlanKey, Record<Language, string>>;

const PLAN_KEYS: PlanKey[] = ["pro_monthly", "pro_yearly", "founding_member"];
const LANGUAGES: Language[] = ["en", "tr", "es", "zh"];
const DEFAULT_NAMES: LocalizedNames = {
  pro_monthly: { en: "Pro Monthly", tr: "Pro Aylık", es: "Pro Mensual", zh: "Pro 月度版" },
  pro_yearly: { en: "Pro Yearly", tr: "Pro Yıllık", es: "Pro Anual", zh: "Pro 年度版" },
  founding_member: { en: "Founding Member", tr: "Kurucu Üye", es: "Miembro Fundador", zh: "创始会员" },
};

const COPY = {
  en: {
    title: "EshipX sales settings", subtitle: "Control payment availability, checkout destinations, prices, and the package names shown to each language.",
    enabled: "EshipX payments are open", disabled: "EshipX payments are closed", toggleHelp: "When closed, users can view plans but cannot start a payment.",
    monthly: "Monthly", yearly: "Yearly", lifetime: "Lifetime / Founding", link: "Checkout link", price: "Displayed price (USD)", names: "Localized package names", save: "Save sales settings", saving: "Saving…", saved: "Sales settings saved.",
    linkHelp: "Secure EshipX links and EshipX-issued Stripe Checkout links are accepted.", security: "Card details stay on EshipX or its Stripe Checkout page. OnPace only receives the payer email entered by the user and the transaction reference entered by an administrator.", bcc: "Billing team BCC", bccHelp: "New payment notices, activation, and cancellation updates always go to onpace.launchx@gmail.com. Add optional team recipients as comma-separated BCC addresses.", error: "Sales settings could not be saved.",
  },
  tr: {
    title: "eShipX satış ayarları", subtitle: "Ödeme durumunu, yönlendirme bağlantılarını, fiyatları ve her dilde gösterilecek paket adlarını yönetin.",
    enabled: "eShipX ödemeleri açık", disabled: "eShipX ödemeleri kapalı", toggleHelp: "Kapalıyken kullanıcılar paketleri görebilir ancak ödeme başlatamaz.",
    monthly: "Aylık", yearly: "Yıllık", lifetime: "Ömür boyu / Kurucu", link: "Ödeme bağlantısı", price: "Gösterilen fiyat (USD)", names: "Dile özel paket adları", save: "Satış ayarlarını kaydet", saving: "Kaydediliyor…", saved: "Satış ayarları kaydedildi.",
    linkHelp: "Yalnızca güvenli eshipx.com bağlantıları kabul edilir.", security: "Kart bilgileri eShipX'te kalır. OnPace yalnızca kullanıcının girdiği ödeme e-postasını ve yöneticinin girdiği işlem referansını saklar.", bcc: "Ödeme ekibi BCC", bccHelp: "Yeni ödeme bildirimleri, aktivasyon ve iptal güncellemeleri her zaman onpace.launchx@gmail.com adresine gider. İsteğe bağlı ekip adreslerini virgülle ayırarak BCC'ye ekleyin.", error: "Satış ayarları kaydedilemedi.",
  },
  es: {
    title: "Configuración de ventas de EshipX", subtitle: "Controla la disponibilidad, los enlaces de pago, los precios y los nombres de los planes en cada idioma.",
    enabled: "Los pagos EshipX están abiertos", disabled: "Los pagos EshipX están cerrados", toggleHelp: "Si está cerrado, los usuarios pueden ver los planes, pero no iniciar el pago.",
    monthly: "Mensual", yearly: "Anual", lifetime: "De por vida / Fundador", link: "Enlace de pago", price: "Precio mostrado (USD)", names: "Nombres localizados", save: "Guardar configuración", saving: "Guardando…", saved: "Configuración guardada.",
    linkHelp: "Solo se aceptan enlaces seguros de eshipx.com.", security: "Los datos de la tarjeta permanecen en EshipX. OnPace solo guarda el correo del pagador y la referencia introducida por un administrador.", bcc: "CCO del equipo de pagos", bccHelp: "Los nuevos avisos, activaciones y cancelaciones siempre se envían a onpace.launchx@gmail.com. Añade direcciones opcionales separadas por comas en CCO.", error: "No se pudo guardar la configuración.",
  },
  zh: {
    title: "EshipX 销售设置", subtitle: "管理付款开关、结账链接、价格以及四种语言显示的套餐名称。",
    enabled: "EshipX 付款已开启", disabled: "EshipX 付款已关闭", toggleHelp: "关闭后，用户仍可查看套餐，但无法发起付款。",
    monthly: "月度", yearly: "年度", lifetime: "终身 / 创始", link: "付款链接", price: "显示价格（USD）", names: "多语言套餐名称", save: "保存销售设置", saving: "正在保存…", saved: "销售设置已保存。",
    linkHelp: "仅接受安全的 eshipx.com 链接。", security: "银行卡信息始终保留在 EshipX。OnPace 只保存用户填写的付款邮箱和管理员填写的交易参考号。", bcc: "付款团队密送", bccHelp: "新的付款通知、开通和取消更新始终会发送至 onpace.launchx@gmail.com。可将其他团队地址以逗号分隔后添加为密送。", error: "无法保存销售设置。",
  },
} as const;

function normalizeNames(value: unknown): LocalizedNames {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result = structuredClone(DEFAULT_NAMES);
  for (const plan of PLAN_KEYS) {
    const names = source[plan] && typeof source[plan] === "object" && !Array.isArray(source[plan]) ? source[plan] as Record<string, unknown> : {};
    for (const language of LANGUAGES) {
      const label = typeof names[language] === "string" ? names[language].trim() : "";
      if (label) result[plan][language] = label;
    }
  }
  return result;
}

export function PaymentCatalogSettings({ language }: { language: Language }) {
  const t = COPY[language] || COPY.en;
  const [supabase] = useState(() => createClient());
  const [enabled, setEnabled] = useState(false);
  const [urls, setUrls] = useState<Record<PlanKey, string>>({ pro_monthly: "", pro_yearly: "", founding_member: "" });
  const [prices, setPrices] = useState<Record<PlanKey, number>>({ pro_monthly: 6.99, pro_yearly: 59.99, founding_member: 99 });
  const [names, setNames] = useState<LocalizedNames>(DEFAULT_NAMES);
  const [billingBcc, setBillingBcc] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void supabase.rpc("get_public_system_settings").then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) {
        setError(loadError.message);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        setEnabled(Boolean(row?.payment_gateway_enabled));
        setUrls({
          pro_monthly: String(row?.payment_checkout_urls?.pro_monthly || ""),
          pro_yearly: String(row?.payment_checkout_urls?.pro_yearly || ""),
          founding_member: String(row?.payment_checkout_urls?.founding_member || ""),
        });
        setPrices({
          pro_monthly: Number(row?.plan_prices?.pro_monthly ?? row?.plan_prices?.pro ?? 6.99),
          pro_yearly: Number(row?.plan_prices?.pro_yearly ?? 59.99),
          founding_member: Number(row?.plan_prices?.founding_member ?? row?.plan_prices?.founding ?? 99),
        });
        setNames(normalizeNames(row?.plan_names));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/integration-config")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(t.error)))
      .then((data) => {
        if (!active) return;
        const recipients = Array.isArray(data?.billing_notification_bcc) ? data.billing_notification_bcc : [];
        setBillingBcc(recipients.filter((item: unknown) => typeof item === "string").join(", "));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [t.error]);

  async function save(nextEnabled = enabled) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/integration-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentGatewayEnabled: nextEnabled,
          paymentProvider: "eshipx",
          paymentCheckoutUrls: urls,
          planNames: names,
          planPrices: prices,
          billingNotificationBcc: billingBcc,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) throw new Error(data?.error || t.error);
      setEnabled(nextEnabled);
      setMessage(t.saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.error);
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    const next = !enabled;
    if (next && !Object.values(urls).some((url) => url.trim())) {
      setError(t.linkHelp);
      return;
    }
    await save(next);
  }

  if (loading) return <div className="flex justify-center rounded-3xl border border-gray-150 bg-white py-20"><Loader2 className="animate-spin text-brand" /></div>;

  const planLabels: Record<PlanKey, string> = { pro_monthly: t.monthly, pro_yearly: t.yearly, founding_member: t.lifetime };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-gray-150 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-brand-dark p-5 text-white sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-indigo-200 ring-1 ring-white/15"><CreditCard size={24} /></span>
            <div><h3 className="text-xl font-black">{t.title}</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-indigo-100/75 sm:text-sm">{t.subtitle}</p></div>
          </div>
          <button type="button" onClick={() => void toggle()} disabled={saving} className={`inline-flex min-w-48 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-extrabold ring-1 transition ${enabled ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/25" : "bg-white/10 text-white ring-white/15"}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-slate-400"}`} />{enabled ? t.enabled : t.disabled}
          </button>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6 lg:p-7">
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900"><ShieldCheck className="mt-0.5 shrink-0" size={17} /><div><p className="font-bold">{t.toggleHelp}</p><p className="mt-1 text-blue-700">{t.security}</p></div></div>
        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
        {message && <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"><CheckCircle2 size={16} />{message}</div>}

        <div className="grid gap-4 xl:grid-cols-3">
          {PLAN_KEYS.map((plan) => (
            <article key={plan} className="rounded-3xl border border-gray-150 bg-slate-50/45 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-extrabold text-surface-dark">{planLabels[plan]}</h4>{urls[plan] && <a href={urls[plan]} target="_blank" rel="noreferrer" className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-brand" aria-label={t.link}><ExternalLink size={14} /></a>}</div>
              <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-gray-500">{t.link}<input type="url" value={urls[plan]} onChange={(event) => setUrls((current) => ({ ...current, [plan]: event.target.value }))} placeholder="https://eshipx.com/store/..." className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs font-medium normal-case tracking-normal text-surface-dark outline-none focus:border-brand" /></label>
              <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-gray-500">{t.price}<input type="number" min="0" step="0.01" value={prices[plan]} onChange={(event) => setPrices((current) => ({ ...current, [plan]: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-extrabold normal-case tracking-normal text-surface-dark outline-none focus:border-brand" /></label>
              <div className="mt-4 border-t border-gray-200 pt-4"><p className="text-[10px] font-black uppercase tracking-wider text-gray-500">{t.names}</p><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{LANGUAGES.map((locale) => <label key={locale} className="text-[9px] font-black uppercase tracking-wider text-gray-400">{locale}<input required maxLength={80} value={names[plan][locale]} onChange={(event) => setNames((current) => ({ ...current, [plan]: { ...current[plan], [locale]: event.target.value } }))} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-surface-dark outline-none focus:border-brand" /></label>)}</div></div>
            </article>
          ))}
        </div>

        <label className="block rounded-2xl border border-gray-150 bg-slate-50/60 p-4 text-[10px] font-black uppercase tracking-wider text-gray-500">
          {t.bcc}
          <input type="text" value={billingBcc} onChange={(event) => setBillingBcc(event.target.value)} placeholder="team@example.com, billing@example.com" className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs font-semibold normal-case tracking-normal text-surface-dark outline-none focus:border-brand" />
          <span className="mt-2 block normal-case text-[11px] font-medium leading-5 text-gray-500">{t.bccHelp}</span>
        </label>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] leading-4 text-gray-400">{t.linkHelp}</p><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white shadow-sm disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? t.saving : t.save}</button></div>
      </div>
    </section>
  );
}
