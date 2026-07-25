import { NextResponse } from "next/server";
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
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Only images smaller than 10 MB are allowed." },
        { status: 413 }
      );
    }

    const edgeBody = new FormData();
    edgeBody.append("file", file, file.name);
    const { data, error } = await supabase.functions.invoke("r2-upload", {
      body: edgeBody,
    });
    if (error || data?.error) {
      return NextResponse.json(
        { error: data?.error || error?.message || "R2 upload failed." },
        { status: 503 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Upload bridge error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}
