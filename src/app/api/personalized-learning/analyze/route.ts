import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AIServiceError, generateAIText, parseAIJson } from "@/lib/ai/server"

const MAX_TEXT_LENGTH = 40_000
const MAX_QUESTION_LENGTH = 5_000
const MAX_PDF_BASE64_LENGTH = 5_600_000

const LEARNING_TOOLS: Record<string, string> = {
  "visual-map": "Visual map: show important relationships in a compact text diagram or clearly labelled sequence. Do not invent a chart when the source has no meaningful relationship to plot.",
  "real-life": "Real-life application: explain the concept with one concrete, accurate everyday, academic, or professional situation.",
  "worked-example": "Worked example: solve one representative problem step by step, naming the reason for every important step. If the source contains no problem, use a small illustrative example and mark it as illustrative.",
  "retrieval-practice": "Retrieval practice: ask 3 short questions first. Put concise answers immediately after a clearly labelled answer section so the learner can cover them before checking.",
  "self-explanation": "Teach-back: ask the learner to explain the central idea in their own words, then give a checklist for a strong explanation and one common misconception to avoid.",
  "data-lens": "Data and evidence lens: surface only statistics, quantities, formulas, or evidence actually present in the source. If none exist, explicitly say that the source does not provide reliable data for this lens; never make up statistics.",
  "chunked-scaffold": "Chunked scaffold: split the material into three progressively harder chunks, giving a small hint before each harder step.",
  "compare-contrast": "Compare and contrast: make a concise table or paired list that distinguishes closely related ideas, including the most likely confusion.",
}

type LearningResult = {
  title?: unknown
  sourceSummary?: unknown
  directAnswer?: unknown
  toolSections?: unknown
  nextQuestion?: unknown
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const question = typeof body?.question === "string" ? body.question.trim() : ""
    const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim() : ""
    const fileBase64 = typeof body?.fileBase64 === "string" ? body.fileBase64 : ""
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "notes.pdf"
    const fileType = typeof body?.fileType === "string" ? body.fileType : ""
    const language = ["en", "tr", "es", "zh"].includes(body?.language) ? body.language : "en"
    const toolIds = Array.isArray(body?.toolIds)
      ? body.toolIds.filter((id: unknown): id is string => typeof id === "string" && id in LEARNING_TOOLS).slice(0, 3)
      : []

    if (!question && !sourceText && !fileBase64) return NextResponse.json({ error: "Add a question, notes, or a PDF to analyze." }, { status: 400 })
    if (question.length > MAX_QUESTION_LENGTH || sourceText.length > MAX_TEXT_LENGTH) return NextResponse.json({ error: "The question or pasted notes are too long." }, { status: 413 })
    if (fileBase64 && (fileType !== "application/pdf" || fileBase64.length > MAX_PDF_BASE64_LENGTH)) return NextResponse.json({ error: "Use a PDF smaller than 4 MB." }, { status: 413 })
    if (!toolIds.length) return NextResponse.json({ error: "Choose at least one learning tool." }, { status: 400 })

    const selectedInstructions = toolIds.map((id: string) => `- ${LEARNING_TOOLS[id]}`).join("\n")
    const prompt = `Create a personalized study response using only the learner's question and supplied source material.

Learner question: ${question || "No separate question; turn the supplied material into a study guide."}
Pasted notes: ${sourceText || "None"}
PDF attached: ${fileBase64 ? "Yes" : "No"}

Use these selected learning tools:
${selectedInstructions}

Important rules:
- Answer in ${language === "tr" ? "Turkish" : language === "es" ? "Spanish" : language === "zh" ? "Simplified Chinese" : "English"}.
- Be accurate and distinguish source facts from a clearly labelled illustrative example.
- Never invent citations, statistics, formulas, or source content.
- Keep the direct answer concise; give each selected tool its own useful section.
- Return ONLY valid JSON in exactly this shape:
{"title":"short topic title","sourceSummary":"2-5 sentence summary","directAnswer":"direct answer or core study note","toolSections":[{"id":"one selected id","title":"localized section title","content":"helpful study content"}],"nextQuestion":"one short interactive question"}`

    const raw = await generateAIText(supabase, {
      prompt,
      temperature: 0.25,
      json: true,
      skipGateway: Boolean(fileBase64),
      ...(fileBase64 ? { document: { base64: fileBase64, mimeType: "application/pdf", filename: fileName || "notes.pdf" } } : {}),
    })
    const parsed = parseAIJson<LearningResult>(raw)
    const toolSections = Array.isArray(parsed.toolSections)
      ? parsed.toolSections
          .filter((section): section is { id: string; title?: unknown; content?: unknown } => Boolean(section) && typeof section === "object" && toolIds.includes((section as { id?: unknown }).id as string))
          .map((section) => ({ id: section.id, title: safeText(section.title, section.id), content: safeText(section.content) }))
          .filter((section) => section.content)
      : []

    return NextResponse.json({ result: {
      title: safeText(parsed.title, "Personalized study guide"),
      sourceSummary: safeText(parsed.sourceSummary),
      directAnswer: safeText(parsed.directAnswer, raw),
      toolSections,
      nextQuestion: safeText(parsed.nextQuestion),
    } })
  } catch (error) {
    console.error("Personalized learning analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The learning analysis could not be completed." },
      { status: error instanceof AIServiceError ? error.status : 500 }
    )
  }
}
