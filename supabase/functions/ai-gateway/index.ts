import { createClient } from "npm:@supabase/supabase-js@2"
import { corsPreflight, json, readProviderError } from "../_shared/http.ts"

interface HistoryMessage {
  role: "user" | "assistant"
  content: string
}

type AIWorkload = "fast" | "reasoning"

const OPENAI_FAST_MODEL = "gpt-4o-mini"
const OPENAI_REASONING_MODEL = "gpt-5.6-luna"

function cleanBase64(value: string) {
  const comma = value.indexOf(",")
  return value.startsWith("data:") && comma >= 0 ? value.slice(comma + 1) : value
}

function readResponsesText(result: unknown) {
  if (!result || typeof result !== "object") return ""
  const response = result as {
    output_text?: unknown
    output?: unknown
  }
  if (typeof response.output_text === "string") return response.output_text
  if (!Array.isArray(response.output)) return ""

  return response.output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const content = (item as { content?: unknown }).content
      return Array.isArray(content) ? content : []
    })
    .map((part) => {
      if (!part || typeof part !== "object") return ""
      const text = (part as { text?: unknown }).text
      return typeof text === "string" ? text : ""
    })
    .join("")
}

Deno.serve(async (request) => {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const url = Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || ""
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const authorization = request.headers.get("Authorization") || ""
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const {
      data: { user },
    } = await caller.auth.getUser()
    if (!user) return json({ error: "Unauthorized" }, 401)

    const body = await request.json()
    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return json({ error: "Prompt is required" }, 400)
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin.rpc("get_edge_integration_config")
    if (error) return json({ error: error.message }, 503)
    const config = Array.isArray(data) ? data[0] : data
    const { data: modelData } = await admin.rpc("get_ai_model_settings")
    const modelSettings = Array.isArray(modelData) ? modelData[0] : modelData
    const requestedProvider = config?.active_provider === "openai" ? "openai" : "gemini"
    const provider = requestedProvider === "openai" && !config?.openai_api_key && config?.gemini_api_key
      ? "gemini"
      : requestedProvider === "gemini" && !config?.gemini_api_key && config?.openai_api_key
        ? "openai"
        : requestedProvider
    const { data: quotaData, error: quotaError } = await caller.rpc(
      "consume_ai_quota"
    )
    if (quotaError) return json({ error: quotaError.message }, 503)
    const quota = Array.isArray(quotaData) ? quotaData[0] : quotaData
    if (quota?.allowed === false) {
      return json(
        {
          error:
            "Daily AI limit reached. Upgrade to Pro for unlimited AI access.",
          code: "AI_DAILY_LIMIT",
          remaining: 0,
        },
        429
      )
    }
    const history: HistoryMessage[] = Array.isArray(body.history)
      ? body.history.slice(-20)
      : []

    if (provider === "openai") {
      if (!config?.openai_api_key) return json({ error: "OpenAI is not configured" }, 503)
      const workload: AIWorkload = body.workload === "fast" ? "fast" : "reasoning"
      const routingMode = modelSettings?.openai_routing_mode === "single"
        ? "single"
        : "smart"
      const configuredModel = modelSettings?.openai_default_model === OPENAI_FAST_MODEL
        ? OPENAI_FAST_MODEL
        : OPENAI_REASONING_MODEL
      const model = routingMode === "smart"
        ? workload === "fast" ? OPENAI_FAST_MODEL : OPENAI_REASONING_MODEL
        : configuredModel
      const userContent: unknown[] = [{ type: "input_text", text: body.prompt }]
      if (body.image?.base64) {
        userContent.push({
          type: "input_image",
          image_url: `data:${body.image.mimeType || "image/png"};base64,${cleanBase64(body.image.base64)}`,
          detail: "auto",
        })
      }
      if (body.document?.base64) {
        userContent.push({
          type: "input_file",
          filename: body.document.filename || "document.pdf",
          file_data: `data:${body.document.mimeType || "application/pdf"};base64,${cleanBase64(body.document.base64)}`,
        })
      }
      const hasRichUserContent = Boolean(body.image?.base64 || body.document?.base64)

      const modelCandidates = model === OPENAI_REASONING_MODEL
        ? [OPENAI_REASONING_MODEL, OPENAI_FAST_MODEL]
        : [OPENAI_FAST_MODEL, OPENAI_REASONING_MODEL]
      let lastOpenAIError = "OpenAI request failed"
      let lastOpenAIStatus = 502

      for (const candidateModel of modelCandidates) {
        const useResponses = candidateModel.startsWith("gpt-5.6") || Boolean(body.document?.base64)
        const endpoint = useResponses
          ? "https://api.openai.com/v1/responses"
          : "https://api.openai.com/v1/chat/completions"
        const requestBody = useResponses
          ? {
              model: candidateModel,
              ...(body.systemInstruction
                ? { instructions: body.systemInstruction }
                : {}),
              input: [
                ...history.map((message) => ({
                  role: message.role,
                  content: [{
                    type: message.role === "assistant" ? "output_text" : "input_text",
                    text: message.content,
                  }],
                })),
                { role: "user", content: hasRichUserContent ? userContent : body.prompt },
              ],
              ...(candidateModel.startsWith("gpt-5.6")
                ? { reasoning: { effort: workload === "reasoning" ? "low" : "none" } }
                : { temperature: Number(body.temperature ?? 0.3) }),
              safety_identifier: user.id,
            }
          : {
              model: candidateModel,
              messages: [
                ...(body.systemInstruction
                  ? [{ role: "system", content: body.systemInstruction }]
                  : []),
                ...history,
                {
                  role: "user",
                  content: body.image?.base64
                    ? [
                        { type: "text", text: body.prompt },
                        {
                          type: "image_url",
                          image_url: {
                            url: `data:${body.image.mimeType || "image/png"};base64,${cleanBase64(body.image.base64)}`,
                          },
                        },
                      ]
                    : body.prompt,
                },
              ],
              temperature: Number(body.temperature ?? 0.3),
            }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.openai_api_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })
        if (!response.ok) {
          lastOpenAIStatus = response.status
          lastOpenAIError = await readProviderError(response)
          console.warn("OpenAI model attempt failed", { candidateModel, status: response.status })
          continue
        }
        const result = await response.json()
        const text = useResponses
          ? readResponsesText(result)
          : result?.choices?.[0]?.message?.content
        if (text) return json({ text, provider, model: result.model || candidateModel })
        lastOpenAIError = "OpenAI returned an empty response"
        lastOpenAIStatus = 502
      }

      if (!config?.gemini_api_key) {
        return json({ error: lastOpenAIError }, lastOpenAIStatus)
      }
      console.warn("OpenAI attempts failed; using the configured Gemini backup provider", {
        status: lastOpenAIStatus,
      })
    }

    if (!config?.gemini_api_key) return json({ error: "Gemini is not configured" }, 503)
    const parts: unknown[] = [{ text: body.prompt }]
    if (body.image?.base64) {
      parts.push({
        inline_data: {
          mime_type: body.image.mimeType || "image/png",
          data: cleanBase64(body.image.base64),
        },
      })
    }
    if (body.document?.base64) {
      parts.push({
        inline_data: {
          mime_type: body.document.mimeType || "application/pdf",
          data: cleanBase64(body.document.base64),
        },
      })
    }
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash"
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.gemini_api_key,
        },
        body: JSON.stringify({
          ...(body.systemInstruction
            ? { system_instruction: { parts: [{ text: body.systemInstruction }] } }
            : {}),
          contents: [
            ...history.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
            { role: "user", parts },
          ],
          generationConfig: {
            temperature: Number(body.temperature ?? 0.3),
            ...(body.json ? { response_mime_type: "application/json" } : {}),
          },
        }),
      }
    )
    if (!response.ok) {
      return json({ error: await readProviderError(response) }, response.status)
    }
    const result = await response.json()
    const text = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
    if (!text) return json({ error: "Gemini returned an empty response" }, 502)
    return json({ text, provider: "gemini", model: result.modelVersion || model })
  } catch (error) {
    console.error("AI gateway error", error)
    return json(
      { error: error instanceof Error ? error.message : "AI request failed" },
      500
    )
  }
})
