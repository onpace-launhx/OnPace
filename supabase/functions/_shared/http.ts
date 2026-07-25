export const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

export function corsPreflight(request: Request) {
  if (request.method !== "OPTIONS") return null
  return new Response("ok", { headers: jsonHeaders })
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  })
}

export async function readProviderError(response: Response) {
  const text = await response.text()
  try {
    const parsed = JSON.parse(text)
    return parsed?.error?.message || parsed?.message || text
  } catch {
    return text || `HTTP ${response.status}`
  }
}
