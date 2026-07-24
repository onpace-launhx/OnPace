import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Config } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Retrieve database-configured R2 Client & settings
    let r2Config;
    try {
      r2Config = await getR2Config();
    } catch (configErr: any) {
      return NextResponse.json({ error: configErr.message || "R2 storage not configured." }, { status: 400 });
    }

    const { client: r2Client, bucketName, publicUrl } = r2Config;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique file name
    const fileExtension = file.name.split(".").pop();
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
    const contentType = file.type || "application/octet-stream";

    // Upload to Cloudflare R2
    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: contentType,
    };

    await r2Client.send(new PutObjectCommand(uploadParams));

    // Construct public url
    // Remove trailing slash from public URL if present, then append the file name
    const publicBaseUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;
    const fileUrl = `${publicBaseUrl}/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      contentType: contentType,
    });
  } catch (error: any) {
    console.error("R2 Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file to R2" }, { status: 500 });
  }
}
