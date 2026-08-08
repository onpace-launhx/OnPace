"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Gift, Loader2, RotateCcw, Users } from "lucide-react";

type Language = "en" | "tr" | "es" | "zh";
type Preview = { operationId: string; previewCount: number; previewToken: string; confirmationText: string; endsAtUtc?: string | null };

const COPY = {
  en: {
    title: "Bulk access actions", help: "Use the two steps in order. Learning data is never deleted.", reset: "1. Cancel subscriptions & make Free", grant: "2. Grant timed free Pro", target: "Affected accounts", all: "All students", free: "Free users", pro: "Pro users", founding: "Founding members", end: "End in US Eastern Time (EST/EDT)", endHelp: "Daylight saving is handled automatically. Everyone receives the same exact end instant in their local time zone.", auto: "Also grant this package automatically to new users who register before it ends", preview: "Preview affected users", affected: "accounts will be affected", utc: "Exact UTC end", local: "Your local equivalent", confirm: "Type the exact confirmation text", executeReset: "Cancel and move to Free", executeGrant: "Grant free Pro access", resetWarning: "All open manual subscriptions for the matched accounts are canceled immediately and plan access moves to Free. Notes, tasks, chats, calendar, courses, and study history are preserved.", grantWarning: "Only Free accounts receive complimentary Pro until the selected time. No paid subscription is created and no payment is collected.", completeReset: "Subscriptions canceled and accounts moved to Free. You can now complete step 2", completeGrant: "Timed free Pro access granted", error: "The operation could not be completed.", publishPending: "This operation needs the subscription service included in the final Supabase release.", databaseMissing: "Run the 202608090005 Supabase SQL update once, then try again.",
  },
  tr: {
    title: "Toplu erişim işlemleri", help: "İki adımı sırayla uygulayın. Öğrenme verileri hiçbir zaman silinmez.", reset: "1. Abonelikleri iptal et ve Free yap", grant: "2. Süreli ücretsiz Pro ver", target: "Etkilenecek hesaplar", all: "Tüm öğrenciler", free: "Ücretsiz kullanıcılar", pro: "Pro kullanıcılar", founding: "Kurucu üyeler", end: "ABD Doğu Saatine göre bitiş (EST/EDT)", endHelp: "Yaz/kış saati otomatik hesaplanır. Herkes için aynı kesin bitiş anı kendi yerel saatinde gösterilir.", auto: "Kampanya bitene kadar yeni kayıt olan kullanıcılara da otomatik tanımla", preview: "Etkilenecek kullanıcıları önizle", affected: "hesap etkilenecek", utc: "Kesin UTC bitişi", local: "Sizin yerel karşılığı", confirm: "Onay metnini birebir yazın", executeReset: "İptal et ve Free yap", executeGrant: "Ücretsiz Pro erişimi ver", resetWarning: "Eşleşen hesapların açık manuel abonelikleri hemen iptal edilir ve paketleri Free yapılır. Notlar, görevler, sohbetler, takvim, dersler ve çalışma geçmişi korunur.", grantWarning: "Yalnızca Free hesaplara seçilen zamana kadar ücretsiz Pro erişimi verilir. Ücretli abonelik oluşturulmaz ve ücret alınmaz.", completeReset: "Abonelikler iptal edildi ve hesaplar Free yapıldı. Şimdi 2. adımı tamamlayabilirsiniz", completeGrant: "Süreli ücretsiz Pro erişimi tanımlandı", error: "İşlem tamamlanamadı.", publishPending: "Bu işlem için abonelik servisinin toplu Supabase yayınında yayınlanması gerekiyor.", databaseMissing: "202608090005 numaralı Supabase SQL güncellemesini bir kez çalıştırıp tekrar deneyin.",
  },
  es: {
    title: "Acciones masivas de acceso", help: "Completa los dos pasos en orden. Los datos de aprendizaje nunca se eliminan.", reset: "1. Cancelar suscripciones y pasar a Gratis", grant: "2. Conceder Pro gratuito temporal", target: "Cuentas afectadas", all: "Todos los estudiantes", free: "Usuarios gratuitos", pro: "Usuarios Pro", founding: "Miembros fundadores", end: "Fin en hora del Este de EE. UU. (EST/EDT)", endHelp: "El horario de verano se calcula automáticamente. Todos comparten el mismo instante final en su zona horaria.", auto: "Asignar también a quienes se registren antes del fin", preview: "Previsualizar usuarios", affected: "cuentas afectadas", utc: "Fin UTC exacto", local: "Equivalente local", confirm: "Escribe el texto exacto", executeReset: "Cancelar y pasar a Gratis", executeGrant: "Conceder Pro gratuito", resetWarning: "Las suscripciones manuales abiertas se cancelan inmediatamente y las cuentas pasan al plan Gratuito. Se conservan todos los datos de aprendizaje.", grantWarning: "Solo las cuentas Gratuitas reciben Pro gratuito hasta la hora seleccionada. No se crea ninguna suscripción de pago.", completeReset: "Suscripciones canceladas y cuentas movidas a Gratis. Ahora puedes completar el paso 2", completeGrant: "Acceso Pro gratuito temporal concedido", error: "No se pudo completar la operación.", publishPending: "Esta acción requiere publicar el servicio de suscripciones en la versión final de Supabase.", databaseMissing: "Ejecuta una vez la actualización SQL 202608090005 de Supabase y vuelve a intentarlo.",
  },
  zh: {
    title: "批量权限操作", help: "请按顺序完成两个步骤。学习数据永远不会被删除。", reset: "1. 取消订阅并转为免费版", grant: "2. 赠送限时免费 Pro", target: "目标账户", all: "所有学生", free: "免费用户", pro: "Pro 用户", founding: "创始会员", end: "美国东部时间结束（EST/EDT）", endHelp: "系统自动处理夏令时，所有用户在各自时区共享同一准确结束时刻。", auto: "活动结束前也自动分配给新注册用户", preview: "预览受影响用户", affected: "个账户将受影响", utc: "准确 UTC 结束时间", local: "您的当地时间", confirm: "输入完全一致的确认文字", executeReset: "取消并转为免费版", executeGrant: "赠送免费 Pro", resetWarning: "匹配账户的有效手动订阅将立即取消并转为免费版，所有学习数据都会保留。", grantWarning: "只有免费账户会在所选时间前获得免费 Pro，不会创建付费订阅或收费。", completeReset: "订阅已取消，账户已转为免费版。现在可以完成第 2 步", completeGrant: "限时免费 Pro 权限已开通", error: "操作未能完成。", publishPending: "此操作需要在最终 Supabase 发布中一并发布订阅服务。", databaseMissing: "请先运行一次 Supabase SQL 更新 202608090005，然后重试。",
  },
} as const;

export function BulkAccessControls({ language, onComplete }: { language: Language; onComplete?: () => void | Promise<void> }) {
  const copy = COPY[language] || COPY.en;
  const locale = { en: "en-US", tr: "tr-TR", es: "es-ES", zh: "zh-CN" }[language];
  const [mode, setMode] = useState<"reset" | "grant">("reset");
  const [targetPlan, setTargetPlan] = useState("all");
  const [endsAtEastern, setEndsAtEastern] = useState("");
  const [autoAssign, setAutoAssign] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearPreview = () => { setPreview(null); setConfirmation(""); setSuccess(""); };
  async function call(body: Record<string, unknown>) {
    const response = await fetch("/api/billing/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      const rawMessage = String(data?.error || "");
      const message = /202608090005|bulk access database update/i.test(rawMessage)
        ? copy.databaseMissing
        : /waiting for the final release|requested function|function.*not found/i.test(rawMessage)
          ? copy.publishPending
          : data?.error || copy.error;
      throw new Error(message);
    }
    return data;
  }
  async function createPreview() {
    setBusy(true); setError(""); clearPreview();
    try { setPreview(await call({ action: "bulk_preview", mode, targetPlan, endsAtEastern: mode === "grant" ? endsAtEastern : undefined, autoAssignNewUsers: mode === "grant" && autoAssign })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : copy.error); }
    finally { setBusy(false); }
  }
  async function execute() {
    if (!preview || confirmation !== preview.confirmationText) return;
    setBusy(true); setError("");
    try {
      const result = await call({ action: "bulk_execute", operationId: preview.operationId, previewToken: preview.previewToken, confirmation });
      const completedMode = mode;
      setSuccess(`${completedMode === "grant" ? copy.completeGrant : copy.completeReset}: ${result.affectedCount}`);
      setPreview(null); setConfirmation("");
      if (completedMode === "reset") { setMode("grant"); setTargetPlan("free"); }
      await onComplete?.();
    } catch (caught) { setError(caught instanceof Error ? caught.message : copy.error); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-gray-150 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3"><span className="rounded-xl bg-brand/10 p-2.5 text-brand"><Users size={19} /></span><div><h2 className="text-sm font-extrabold text-surface-dark sm:text-base">{copy.title}</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">{copy.help}</p></div></div>
        <div className="grid w-full gap-2 rounded-xl bg-slate-100 p-1 sm:grid-cols-2 xl:w-auto xl:min-w-[560px]"><button type="button" onClick={() => { setMode("reset"); setTargetPlan("all"); clearPreview(); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold ${mode === "reset" ? "bg-white text-red-700 shadow-sm" : "text-gray-500"}`}><RotateCcw size={14} />{copy.reset}</button><button type="button" onClick={() => { setMode("grant"); setTargetPlan("free"); clearPreview(); }} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold ${mode === "grant" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"}`}><Gift size={14} />{copy.grant}</button></div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-gray-600">{copy.target}<select value={targetPlan} disabled={mode === "grant"} onChange={(event) => { setTargetPlan(event.target.value); clearPreview(); }} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-gray-500"><option value="all">{copy.all}</option><option value="free">{copy.free}</option><option value="pro">{copy.pro}</option><option value="founding">{copy.founding}</option></select></label>
        {mode === "grant" && <label className="text-xs font-bold text-gray-600 md:col-span-1 xl:col-span-2">{copy.end}<input type="datetime-local" value={endsAtEastern} onChange={(event) => { setEndsAtEastern(event.target.value); clearPreview(); }} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /><span className="mt-1 block text-[10px] font-normal leading-4 text-gray-400">{copy.endHelp}</span></label>}
        <div className="flex items-end"><button type="button" disabled={busy || (mode === "grant" && !endsAtEastern)} onClick={() => void createPreview()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5 text-sm font-bold text-brand disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" />}{copy.preview}</button></div>
        {mode === "grant" && <label className="flex items-start gap-2 rounded-xl border border-gray-200 p-3 text-xs font-semibold text-gray-700 md:col-span-2 xl:col-span-4"><input type="checkbox" checked={autoAssign} onChange={(event) => { setAutoAssign(event.target.checked); clearPreview(); }} className="mt-0.5 h-4 w-4 accent-brand" /><span>{copy.auto}</span></label>}
      </div>
      <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-xs font-semibold leading-5 ${mode === "grant" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}><AlertTriangle className="mt-0.5 shrink-0" size={14} /><span>{mode === "grant" ? copy.grantWarning : copy.resetWarning}</span></div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
      {success && <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"><CheckCircle2 size={15} />{success}</p>}
      {preview && <div className="mt-4 rounded-2xl border border-gray-200 bg-slate-50/50 p-4"><p className="text-sm font-extrabold text-surface-dark">{preview.previewCount} {copy.affected}</p>{preview.endsAtUtc && <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-xl bg-white p-3"><dt className="font-bold text-gray-400">{copy.utc}</dt><dd className="mt-1 font-semibold">{new Date(preview.endsAtUtc).toLocaleString("en-GB", { timeZone: "UTC", timeZoneName: "short" })}</dd></div><div className="rounded-xl bg-white p-3"><dt className="font-bold text-gray-400">{copy.local}</dt><dd className="mt-1 font-semibold">{new Date(preview.endsAtUtc).toLocaleString(locale, { timeZoneName: "short" })}</dd></div></dl>}<p className="mt-3 text-xs font-bold text-gray-600">{copy.confirm}</p><code className="mt-1 block overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs font-bold">{preview.confirmationText}</code><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" /><button type="button" disabled={busy || confirmation !== preview.confirmationText} onClick={() => void execute()} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40 sm:w-auto ${mode === "grant" ? "bg-emerald-600" : "bg-red-600"}`}>{busy && <Loader2 size={15} className="animate-spin" />}{mode === "grant" ? copy.executeGrant : copy.executeReset}</button></div>}
    </section>
  );
}
