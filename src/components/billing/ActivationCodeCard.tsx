"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";

const COPY = {
  en: { title: "Have an EshipX activation code?", desc: "Enter the code issued after your payment. Codes are bound to one OnPace account for your security.", placeholder: "XXXXX-XXXXX-XXXXX-XXXXX", activate: "Activate plan", working: "Activating…", success: "Your plan is active. Thank you!", invalid: "The activation code could not be verified." },
  tr: { title: "EshipX aktivasyon kodunuz mu var?", desc: "Ödemenizden sonra verilen kodu girin. Güvenliğiniz için her kod yalnızca tek bir OnPace hesabında çalışır.", placeholder: "XXXXX-XXXXX-XXXXX-XXXXX", activate: "Paketi etkinleştir", working: "Etkinleştiriliyor…", success: "Paketiniz aktif edildi. Teşekkürler!", invalid: "Aktivasyon kodu doğrulanamadı." },
  es: { title: "¿Tienes un código de activación de EshipX?", desc: "Introduce el código recibido tras el pago. Cada código está vinculado a una sola cuenta de OnPace.", placeholder: "XXXXX-XXXXX-XXXXX-XXXXX", activate: "Activar plan", working: "Activando…", success: "Tu plan está activo. ¡Gracias!", invalid: "No se pudo verificar el código de activación." },
  zh: { title: "有 EshipX 激活码吗？", desc: "请输入付款后获得的激活码。为确保安全，每个激活码仅绑定一个 OnPace 账户。", placeholder: "XXXXX-XXXXX-XXXXX-XXXXX", activate: "激活套餐", working: "正在激活…", success: "您的套餐已激活，谢谢！", invalid: "无法验证此激活码。" },
} as const;

export function ActivationCodeCard({ language, onActivated }: { language: string; onActivated: () => Promise<void> | void }) {
  const t = COPY[language as keyof typeof COPY] || COPY.en;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function activate(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setError(""); setSuccess(false);
    try {
      const response = await fetch("/api/billing/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "redeem_code", code }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) throw new Error(data?.error || t.invalid);
      setSuccess(true); setCode(""); await onActivated();
    } catch (caught) { setError(caught instanceof Error ? caught.message : t.invalid); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-3xl border border-brand/15 bg-gradient-to-br from-white to-brand/[0.035] p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><span className="rounded-2xl bg-brand/10 p-2.5 text-brand"><KeyRound size={20} /></span><div><h2 className="text-base font-extrabold text-surface-dark">{t.title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">{t.desc}</p></div></div>
      <form onSubmit={activate} className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="one-time-code" spellCheck={false} placeholder={t.placeholder} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm font-bold tracking-wider text-surface-dark outline-none focus:border-brand" /><button disabled={busy || !code.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? <><Loader2 size={16} className="animate-spin" />{t.working}</> : t.activate}</button></form>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
      {success && <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700"><CheckCircle2 size={15} />{t.success}</p>}
    </section>
  );
}
