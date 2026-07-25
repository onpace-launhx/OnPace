import { PutObjectCommand, S3Client } from "npm:@aws-sdk/client-s3@3"
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsPreflight, json } from "../_shared/http.ts"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

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

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) return json({ error: "No file uploaded" }, 400)
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return json({ error: "Unsupported image type" }, 415)
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return json({ error: "File must be smaller than 10 MB" }, 413)
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin.rpc("get_edge_integration_config")
    if (error) return json({ error: error.message }, 503)
    const config = Array.isArray(data) ? data[0] : data
    if (
      !config?.r2_access_key_id ||
      !config?.r2_secret_access_key ||
      !config?.r2_endpoint ||
      !config?.r2_bucket_name ||
      !config?.r2_public_url
    ) {
      return json({ error: "R2 storage is not configured" }, 503)
    }

    const client = new S3Client({
      region: "auto",
      endpoint: config.r2_endpoint,
      credentials: {
        accessKeyId: config.r2_access_key_id,
        secretAccessKey: config.r2_secret_access_key,
      },
    })
    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "gif"
    const objectKey = `${user.id}/${crypto.randomUUID()}.${extension}`
    await client.send(
      new PutObjectCommand({
        Bucket: config.r2_bucket_name,
        Key: objectKey,
        Body: new Uint8Array(await file.arrayBuffer()),
        ContentType: file.type,
      })
    )

    return json({
      success: true,
      url: `${String(config.r2_public_url).replace(/\/+$/, "")}/${objectKey}`,
      fileName: file.name,
      contentType: file.type,
    })
  } catch (error) {
    console.error("R2 upload error", error)
    return json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      500
    )
  }
})
