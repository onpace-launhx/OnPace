import { S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";

export async function getR2Config() {
  const supabase = await createClient();
  
  // Call secure RPC to fetch active R2 configs on the server side
  const { data: config, error } = await supabase.rpc("get_active_r2_config");
  
  if (error || !config) {
    console.error("Supabase RPC error calling get_active_r2_config:", error);
    throw new Error("R2 storage not configured. Please adjust settings in the Admin Dashboard.");
  }
  
  const activeConfig = Array.isArray(config) ? config[0] : config;
  
  if (!activeConfig?.access_key_id || !activeConfig?.secret_access_key || !activeConfig?.endpoint || !activeConfig?.bucket_name || !activeConfig?.public_url) {
    throw new Error("Cloudflare R2 credentials or configuration parameters are missing.");
  }

  const client = new S3Client({
    region: "auto",
    endpoint: activeConfig.endpoint,
    credentials: {
      accessKeyId: activeConfig.access_key_id,
      secretAccessKey: activeConfig.secret_access_key,
    },
  });

  return {
    client,
    bucketName: activeConfig.bucket_name,
    publicUrl: activeConfig.public_url,
  };
}
