"use client"

import { ChangeEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BarChart3, CheckCircle2, FileText, HelpCircle, Layers, Lightbulb, ListChecks, Loader2, MessageSquare, Save, Sparkles, Upload } from "lucide-react"

type ToolId = "visual-map" | "real-life" | "worked-example" | "retrieval-practice" | "self-explanation" | "data-lens" | "chunked-scaffold" | "compare-contrast"
type ToolSection = { id: ToolId; title: string; content: string }
type AnalysisResult = { title: string; sourceSummary: string; directAnswer: string; toolSections: ToolSection[]; nextQuestion: string }

const tools: Array<{ id: ToolId; icon: typeof BarChart3; title: Record<string, string>; description: Record<string, string> }> = [
  { id: "visual-map", icon: BarChart3, title: { en: "Visual map", tr: "Görsel harita", es: "Mapa visual", zh: "视觉图谱" }, description: { en: "Relationships, flows, and labelled diagrams.", tr: "İlişkiler, akışlar ve etiketli şemalar.", es: "Relaciones, flujos y diagramas etiquetados.", zh: "关系、流程和带标签的图示。" } },
  { id: "real-life", icon: Lightbulb, title: { en: "Real-life example", tr: "Gerçek hayat örneği", es: "Ejemplo real", zh: "现实案例" }, description: { en: "Connect an idea to a concrete situation.", tr: "Fikri somut bir durumla ilişkilendirir.", es: "Conecta una idea con una situación concreta.", zh: "将概念联系到具体情境。" } },
  { id: "worked-example", icon: ListChecks, title: { en: "Worked example", tr: "Adım adım örnek", es: "Ejemplo resuelto", zh: "分步示例" }, description: { en: "See the reasoning behind every important step.", tr: "Önemli adımların gerekçesini görün.", es: "Ve el razonamiento de cada paso importante.", zh: "查看每个关键步骤背后的推理。" } },
  { id: "retrieval-practice", icon: HelpCircle, title: { en: "Quick quiz", tr: "Kısa quiz", es: "Quiz rápido", zh: "快速测验" }, description: { en: "Try recall questions before checking answers.", tr: "Yanıtlara bakmadan önce hatırlama sorularını deneyin.", es: "Responde antes de comprobar las soluciones.", zh: "先回忆作答，再查看答案。" } },
  { id: "self-explanation", icon: MessageSquare, title: { en: "Teach it back", tr: "Geri anlat", es: "Explícalo", zh: "复述讲解" }, description: { en: "Explain it in your words and catch gaps.", tr: "Kendi sözlerinle anlatıp eksikleri yakala.", es: "Explícalo con tus palabras y detecta vacíos.", zh: "用自己的话解释并发现知识空白。" } },
  { id: "data-lens", icon: BarChart3, title: { en: "Data & evidence", tr: "Veri ve kanıt", es: "Datos y evidencia", zh: "数据与证据" }, description: { en: "Surface only figures and evidence in the source.", tr: "Yalnızca kaynakta geçen sayıları ve kanıtları öne çıkarır.", es: "Muestra solo cifras y evidencia de la fuente.", zh: "仅呈现来源中的数据和证据。" } },
  { id: "chunked-scaffold", icon: Layers, title: { en: "Guided steps", tr: "Kademeli rehber", es: "Pasos guiados", zh: "分层引导" }, description: { en: "Build from the basics with small hints.", tr: "Küçük ipuçlarıyla temelden ilerleyin.", es: "Avanza desde lo básico con pequeñas pistas.", zh: "通过小提示从基础逐步深入。" } },
  { id: "compare-contrast", icon: FileText, title: { en: "Compare ideas", tr: "Fikirleri karşılaştır", es: "Compara ideas", zh: "概念对比" }, description: { en: "Separate similar concepts and common confusions.", tr: "Benzer kavramları ve yaygın karışıklıkları ayırır.", es: "Distingue conceptos similares y confusiones comunes.", zh: "区分相近概念和常见混淆。" } },
]

const copy: Record<string, Record<string, string>> = {
  en: { eyebrow: "Personalized learning", title: "Learn in the way that helps right now", subtitle: "Choose up to three explanation tools. OnPace will apply them to a question, pasted notes, or a PDF without pretending one fixed learning style fits everyone.", preferences: "Your learning tools", choose: "Choose 1–3 tools", save: "Save tools", saved: "Preferences saved", composer: "Bring a question or study material", question: "Question or pasted notes", placeholder: "Example: Explain why a cell divides, or paste your notes here…", attach: "Attach notes PDF", fileLimit: "PDF only, up to 4 MB. The file is analyzed for this request and is not saved as a note automatically.", analyze: "Analyze with my tools", analyzing: "Building your study guide…", remove: "Remove", source: "Source summary", answer: "Core answer", next: "Try this next", limit: "Choose up to three tools to keep the response focused.", error: "Something went wrong. Please try again." },
  tr: { eyebrow: "Kişiselleştirilmiş öğrenme", title: "Tam o anda işine yarayan biçimde öğren", subtitle: "En fazla üç anlatım aracı seç. OnPace bunları soruna, yapıştırdığın notlara veya PDF’e uygular; tek bir sabit öğrenme stilinin herkese uyduğunu varsaymaz.", preferences: "Öğrenme araçların", choose: "1–3 araç seç", save: "Araçları kaydet", saved: "Tercihler kaydedildi", composer: "Bir soru veya çalışma materyali getir", question: "Soru veya yapıştırılmış notlar", placeholder: "Örnek: Hücre neden bölünür? Açıkla veya notlarını buraya yapıştır…", attach: "Not PDF’i ekle", fileLimit: "Yalnızca PDF, en fazla 4 MB. Dosya bu istek için analiz edilir; otomatik olarak not olarak kaydedilmez.", analyze: "Araçlarımla analiz et", analyzing: "Çalışma rehberin hazırlanıyor…", remove: "Kaldır", source: "Kaynak özeti", answer: "Temel yanıt", next: "Şimdi bunu dene", limit: "Yanıtın odaklı kalması için en fazla üç araç seçebilirsin.", error: "Bir şeyler ters gitti. Lütfen tekrar dene." },
  es: { eyebrow: "Aprendizaje personalizado", title: "Aprende de la forma que te ayude ahora", subtitle: "Elige hasta tres herramientas de explicación. OnPace las aplica a una pregunta, apuntes pegados o un PDF sin asumir que un único estilo fijo sirve para todos.", preferences: "Tus herramientas", choose: "Elige 1–3 herramientas", save: "Guardar herramientas", saved: "Preferencias guardadas", composer: "Trae una pregunta o material de estudio", question: "Pregunta o apuntes pegados", placeholder: "Ejemplo: Explica por qué se divide una célula o pega tus apuntes aquí…", attach: "Adjuntar PDF de apuntes", fileLimit: "Solo PDF, hasta 4 MB. El archivo se analiza para esta solicitud y no se guarda automáticamente como nota.", analyze: "Analizar con mis herramientas", analyzing: "Creando tu guía de estudio…", remove: "Quitar", source: "Resumen de la fuente", answer: "Respuesta central", next: "Prueba esto", limit: "Elige hasta tres herramientas para mantener la respuesta enfocada.", error: "Algo salió mal. Inténtalo de nuevo." },
  zh: { eyebrow: "个性化学习", title: "用此刻最适合你的方式学习", subtitle: "最多选择三种讲解工具。OnPace 会将它们应用于问题、粘贴的笔记或 PDF，而不假设每个人都适合一种固定的学习风格。", preferences: "你的学习工具", choose: "选择 1–3 种工具", save: "保存工具", saved: "偏好已保存", composer: "带来一个问题或学习材料", question: "问题或粘贴的笔记", placeholder: "例如：解释细胞为什么分裂，或在此粘贴你的笔记…", attach: "附加笔记 PDF", fileLimit: "仅限 PDF，最大 4 MB。文件仅为本次请求分析，不会自动保存为笔记。", analyze: "用我的工具分析", analyzing: "正在创建你的学习指南…", remove: "移除", source: "来源摘要", answer: "核心回答", next: "接下来试试这个", limit: "最多选择三种工具，以保持回答聚焦。", error: "出了点问题，请重试。" },
}

function getBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Could not read the PDF."))
    reader.readAsDataURL(file)
  })
}

export function PersonalizedLearningStudio({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState("en")
  const [profileId, setProfileId] = useState("")
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [toolIds, setToolIds] = useState<ToolId[]>(["visual-map", "real-life", "worked-example"])
  const [question, setQuestion] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const t = copy[language] || copy.en

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push("/login")
      const { data } = await supabase.from("profiles").select("id, language, customization_settings").eq("id", user.id).single()
      if (data) {
        setProfileId(data.id)
        setLanguage(data.language || "en")
        const nextSettings = data.customization_settings && typeof data.customization_settings === "object" ? data.customization_settings as Record<string, unknown> : {}
        setSettings(nextSettings)
        const savedModes = (nextSettings.learning_preferences as { modes?: unknown } | undefined)?.modes
        if (Array.isArray(savedModes)) {
          const validModes = savedModes.filter((id): id is ToolId => typeof id === "string" && tools.some((tool) => tool.id === id)).slice(0, 3)
          if (validModes.length) setToolIds(validModes)
        }
      }
      setLoading(false)
    }
    void load()
  }, [router, supabase])

  const toggleTool = (id: ToolId) => setToolIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 3 ? current : [...current, id])
  const savePreferences = async () => {
    if (!profileId || !toolIds.length) return
    setSaving(true); setSaved(false)
    const nextSettings = { ...settings, learning_preferences: { modes: toolIds, detail_depth: "standard" } }
    const { error: updateError } = await supabase.from("profiles").update({ customization_settings: nextSettings }).eq("id", profileId)
    setSaving(false)
    if (updateError) return setError(updateError.message)
    setSettings(nextSettings); setSaved(true); window.setTimeout(() => setSaved(false), 2500)
  }
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null; setError("")
    if (!nextFile) return setFile(null)
    if (nextFile.type !== "application/pdf" || nextFile.size > 4 * 1024 * 1024) { setFile(null); setError(t.fileLimit); event.target.value = ""; return }
    setFile(nextFile)
  }
  const analyze = async () => {
    if (!toolIds.length || (!question.trim() && !file)) return
    setAnalyzing(true); setError(""); setResult(null)
    try {
      const fileBase64 = file ? await getBase64(file) : ""
      const response = await fetch("/api/personalized-learning/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, toolIds, language, ...(file ? { fileBase64, fileName: file.name, fileType: file.type } : {}) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || t.error)
      setResult(data.result)
    } catch (analysisError) { setError(analysisError instanceof Error ? analysisError.message : t.error) } finally { setAnalyzing(false) }
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>

  return <div className={`mx-auto max-w-6xl space-y-7 ${embedded ? "px-0 py-1" : "px-4 py-7 sm:px-6 lg:px-8"}`}>
    {!embedded && <header className="rounded-3xl border border-brand/15 bg-gradient-to-br from-brand/10 via-white to-violet-50 p-6 sm:p-8"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand">{t.eyebrow}</p><h1 className="mt-2 flex items-center gap-2 text-2xl font-black tracking-tight text-surface-dark sm:text-3xl"><Sparkles className="text-brand" />{t.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">{t.subtitle}</p></header>}
    <section className="rounded-3xl border border-gray-150 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-center"><div><h2 className="text-base font-extrabold text-surface-dark">{t.preferences}</h2><p className="mt-1 text-xs text-gray-400">{t.choose}</p></div><button onClick={savePreferences} disabled={saving || !toolIds.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saved ? t.saved : t.save}</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tools.map((tool) => { const active = toolIds.includes(tool.id); const Icon = tool.icon; return <button key={tool.id} onClick={() => toggleTool(tool.id)} className={`rounded-2xl border p-4 text-left transition ${active ? "border-brand bg-brand/5 ring-1 ring-brand/20" : "border-gray-150 bg-white hover:border-brand/35"}`}><span className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl ${active ? "bg-brand text-white" : "bg-gray-100 text-gray-500"}`}><Icon size={16} /></span><p className="text-xs font-extrabold text-surface-dark">{tool.title[language] || tool.title.en}</p><p className="mt-1 text-[11px] leading-4 text-gray-400">{tool.description[language] || tool.description.en}</p></button> })}</div>{toolIds.length >= 3 && <p className="mt-3 text-[11px] font-semibold text-amber-600">{t.limit}</p>}</section>
    <section className="rounded-3xl border border-gray-150 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-base font-extrabold text-surface-dark">{t.composer}</h2><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]"><div><label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{t.question}</label><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t.placeholder} rows={8} className="mt-2 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50/50 p-4 text-sm text-surface-dark outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10" /></div><div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 p-4"><label className="flex cursor-pointer flex-col items-center text-center"><Upload className="mt-4 text-brand" size={24} /><span className="mt-3 text-xs font-extrabold text-surface-dark">{t.attach}</span><span className="mt-2 text-[11px] leading-4 text-gray-400">{t.fileLimit}</span><input type="file" accept="application/pdf" onChange={handleFile} className="sr-only" /></label>{file && <div className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-brand/15 bg-white p-3"><div className="flex min-w-0 items-center gap-2"><FileText className="shrink-0 text-brand" size={16} /><span className="truncate text-[11px] font-bold text-surface-dark">{file.name}</span></div><button onClick={() => setFile(null)} className="text-[10px] font-bold text-red-500">{t.remove}</button></div>}</div></div>{error && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}<button onClick={analyze} disabled={analyzing || !toolIds.length || (!question.trim() && !file)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50">{analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles size={16} />}{analyzing ? t.analyzing : t.analyze}</button></section>
    {result && <section className="space-y-4 rounded-3xl border border-brand/15 bg-white p-5 shadow-sm sm:p-6"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand">{t.eyebrow}</p><h2 className="mt-1 text-xl font-black text-surface-dark">{result.title}</h2></div>{result.sourceSummary && <article className="rounded-2xl bg-gray-50 p-4"><h3 className="text-xs font-extrabold text-surface-dark">{t.source}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{result.sourceSummary}</p></article>}<article className="rounded-2xl border border-brand/15 bg-brand/5 p-4"><h3 className="text-xs font-extrabold text-brand">{t.answer}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-surface-dark">{result.directAnswer}</p></article><div className="grid gap-4 md:grid-cols-2">{result.toolSections.map((section) => <article key={section.id} className="rounded-2xl border border-gray-150 p-4"><h3 className="text-xs font-extrabold text-surface-dark">{section.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{section.content}</p></article>)}</div>{result.nextQuestion && <article className="rounded-2xl bg-violet-50 p-4"><h3 className="text-xs font-extrabold text-violet-700">{t.next}</h3><p className="mt-2 text-sm font-semibold leading-6 text-violet-950">{result.nextQuestion}</p></article>}</section>}
  </div>
}

export default PersonalizedLearningStudio
