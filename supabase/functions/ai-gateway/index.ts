import { createClient } from "npm:@supabase/supabase-js@2"
import { corsPreflight, json, readProviderError } from "../_shared/http.ts"

interface HistoryMessage {
  role: "user" | "assistant"
  content: string
}

function cleanBase64(value: string) {
  const comma = value.indexOf(",")
  return value.startsWith("data:") && comma >= 0 ? value.slice(comma + 1) : value
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
    const provider = config?.active_provider === "openai" ? "openai" : "gemini"
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
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openai_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
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
        }),
      })
      if (!response.ok) {
        return json({ error: await readProviderError(response) }, response.status)
      }
      const result = await response.json()
      const text = result?.choices?.[0]?.message?.content
      if (!text) return json({ error: "OpenAI returned an empty response" }, 502)
      return json({ text, provider, model: result.model })
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
    return json({ text, provider, model: result.modelVersion || model })
  } catch (error) {
    console.error("AI gateway error", error)
    return json(
      { error: error instanceof Error ? error.message : "AI request failed" },
      500
    )
  }
})
