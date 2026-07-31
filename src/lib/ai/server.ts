import type { SupabaseClient } from "@supabase/supabase-js"

type SupabaseLike = SupabaseClient

export type AIProvider = "gemini" | "openai"
export type AIWorkload = "fast" | "reasoning"

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
}

export interface AIHistoryMessage {
  role: "user" | "assistant"
  content: string
}

export interface GenerateAIOptions {
  prompt: string
  workload?: AIWorkload
  systemInstruction?: string
  history?: AIHistoryMessage[]
  temperature?: number
  json?: boolean
  /** A document forwarded through the authenticated AI gateway. */
  document?: {
    base64: string
    mimeType: string
    filename: string
  }
  image?: {
    base64: string
    mimeType: string
  }
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly provider?: AIProvider
  ) {
    super(message)
    this.name = "AIServiceError"
  }
}

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
const DEFAULT_OPENAI_FAST_MODEL = "gpt-4o-mini"
const DEFAULT_OPENAI_REASONING_MODEL = "gpt-5.6-luna"

function normalizeProvider(value: unknown): AIProvider {
  return value === "openai" ? "openai" : "gemini"
}

function defaultOpenAIModel(workload: AIWorkload) {
  return workload === "fast"
    ? DEFAULT_OPENAI_FAST_MODEL
    : DEFAULT_OPENAI_REASONING_MODEL
}

export async function getAIConfig(
  supabase: SupabaseLike,
  workload: AIWorkload = "reasoning"
): Promise<AIConfig> {
  const envProvider = normalizeProvider(process.env.AI_PROVIDER)
  const envKey =
    envProvider === "openai"
      ? process.env.OPENAI_API_KEY
      : process.env.GEMINI_API_KEY

  if (envKey) {
    return {
      provider: envProvider,
      apiKey: envKey,
      model:
        envProvider === "openai"
          ? process.env.OPENAI_MODEL || defaultOpenAIModel(workload)
          : process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    }
  }

  const { data, error } = await supabase.rpc("get_active_ai_config")
  if (error) {
    throw new AIServiceError(
      error.message || "AI configuration could not be loaded.",
      503
    )
  }

  const raw = Array.isArray(data) ? data[0] : data
  const config =
    raw && typeof raw === "object"
      ? (raw as { api_key?: unknown; provider?: unknown })
      : null
  const apiKey =
    typeof config?.api_key === "string" ? config.api_key.trim() : ""
  const provider = normalizeProvider(config?.provider)

  if (!apiKey) {
    throw new AIServiceError(
      "AI is not configured. Ask an administrator to add an AI provider key.",
      503,
      provider
    )
  }

  return {
    provider,
    apiKey,
    model:
      provider === "openai"
        ? process.env.OPENAI_MODEL || defaultOpenAIModel(workload)
        : process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  }
}

async function readError(response: Response) {
  const text = await response.text()
  try {
    const parsed = JSON.parse(text)
    return (
      parsed?.error?.message ||
      parsed?.message ||
      `Provider returned HTTP ${response.status}.`
    )
  } catch {
    return text.slice(0, 500) || `Provider returned HTTP ${response.status}.`
  }
}

function cleanBase64(value: string) {
  const commaIndex = value.indexOf(",")
  return value.startsWith("data:") && commaIndex >= 0
    ? value.slice(commaIndex + 1)
    : value
}

export async function generateAIText(
  supabase: SupabaseLike,
  options: GenerateAIOptions
): Promise<string> {
  if (supabase.functions) {
    const { data, error, response } = await supabase.functions.invoke("ai-gateway", {
      body: options,
    })
    const result =
      data && typeof data === "object"
        ? (data as { text?: unknown; error?: unknown })
        : null

    if (!error && typeof result?.text === "string" && result.text.trim()) {
      return result.text.trim()
    }

    if (error && response?.status !== 404) {
      let message = error.message || "AI Edge Function request failed."
      try {
        const payload = await response?.clone().json()
        if (typeof payload?.error === "string") message = payload.error
      } catch {
        // Keep the invocation error when the response is not JSON.
      }
      throw new AIServiceError(message, response?.status || 502)
    }
    if (!error && typeof result?.error === "string") {
      throw new AIServiceError(result.error, response?.status || 502)
    }

    // A 404 is the only allowed migration fallback while the Edge Function is
    // being deployed. Provider and quota errors must never bypass the gateway.
  }

  const workload = options.workload === "fast" ? "fast" : "reasoning"
  const config = await getAIConfig(supabase, workload)

  if (config.provider === "openai") {
    const useResponses = config.model.startsWith("gpt-5.6") || Boolean(options.document)
    if (useResponses) {
      const userContent: Array<Record<string, unknown>> = [
        { type: "input_text", text: options.prompt },
      ]
      if (options.image) {
        userContent.push({
          type: "input_image",
          image_url: `data:${options.image.mimeType};base64,${cleanBase64(options.image.base64)}`,
          detail: "auto",
        })
      }
      if (options.document) {
        userContent.push({
          type: "input_file",
          filename: options.document.filename,
          file_data: `data:${options.document.mimeType};base64,${cleanBase64(options.document.base64)}`,
        })
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          input: [
            ...(options.systemInstruction
              ? [{
                  role: "developer",
                  content: [{ type: "input_text", text: options.systemInstruction }],
                }]
              : []),
            ...(options.history || []).map((message) => ({
              role: message.role,
              content: [{ type: "input_text", text: message.content }],
            })),
            {
              role: "user",
              content: userContent,
            },
          ],
          ...(config.model.startsWith("gpt-5.6")
            ? { reasoning: { effort: workload === "reasoning" ? "low" : "none" } }
            : { temperature: options.temperature ?? 0.3 }),
        }),
        signal: AbortSignal.timeout(60_000),
      })

      if (!response.ok) {
        throw new AIServiceError(
          `OpenAI Responses request failed: ${await readError(response)}`,
          response.status,
          "openai"
        )
      }

      const data = await response.json()
      const text =
        data?.output_text ||
        data?.output
          ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || [])
          .map((part: { text?: string }) => part.text || "")
          .join("")

      if (typeof text !== "string" || !text.trim()) {
        throw new AIServiceError("OpenAI returned an empty response.", 502, "openai")
      }

      return text.trim()
    }

    const messages = [
      ...(options.systemInstruction
        ? [{ role: "system", content: options.systemInstruction }]
        : []),
      ...(options.history || []),
      {
        role: "user",
        content: options.image
          ? [
              { type: "text", text: options.prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${options.image.mimeType};base64,${cleanBase64(options.image.base64)}`,
                },
              },
            ]
          : options.prompt,
      },
    ]

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options.temperature ?? 0.3,
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!response.ok) {
      throw new AIServiceError(
        `OpenAI request failed: ${await readError(response)}`,
        response.status,
        "openai"
      )
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content
    if (typeof text !== "string" || !text.trim()) {
      throw new AIServiceError(
        "OpenAI returned an empty response.",
        502,
        "openai"
      )
    }

    return text.trim()
  }

  const parts: Array<Record<string, unknown>> = [{ text: options.prompt }]
  if (options.image) {
    parts.push({
      inline_data: {
        mime_type: options.image.mimeType,
        data: cleanBase64(options.image.base64),
      },
    })
  }
  if (options.document) {
    parts.push({
      inline_data: {
        mime_type: options.document.mimeType,
        data: cleanBase64(options.document.base64),
      },
    })
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        ...(options.systemInstruction
          ? {
              system_instruction: {
                parts: [{ text: options.systemInstruction }],
              },
            }
          : {}),
        contents: [
          ...(options.history || []).map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          { role: "user", parts },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          ...(options.json
            ? { response_mime_type: "application/json" }
            : {}),
        },
      }),
      signal: AbortSignal.timeout(45_000),
    }
  )

  if (!response.ok) {
    throw new AIServiceError(
      `Gemini request failed: ${await readError(response)}`,
      response.status,
      "gemini"
    )
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("")

  if (typeof text !== "string" || !text.trim()) {
    const blocked = data?.promptFeedback?.blockReason
    throw new AIServiceError(
      blocked
        ? `Gemini blocked the request: ${blocked}.`
        : "Gemini returned an empty response.",
      502,
      "gemini"
    )
  }

  return text.trim()
}

export function parseAIJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    const firstObject = cleaned.indexOf("{")
    const firstArray = cleaned.indexOf("[")
    const starts = [firstObject, firstArray].filter((index) => index >= 0)
    const start = starts.length ? Math.min(...starts) : -1
    const lastObject = cleaned.lastIndexOf("}")
    const lastArray = cleaned.lastIndexOf("]")
    const end = Math.max(lastObject, lastArray)

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T
    }

    throw new AIServiceError("AI returned invalid structured data.", 502)
  }
}
