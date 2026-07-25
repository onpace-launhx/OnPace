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

    const payload = await request.json();
    const { data, error } = await supabase.functions.invoke(
      "admin-email-broadcast",
      { body: payload }
    );

    if (error) {
      let message = error.message || "Email Edge Function failed.";
      const context = "context" in error ? error.context : null;
      if (context instanceof Response) {
        const responseData = await context.json().catch(() => null);
        message = responseData?.error || message;
      }
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Email Edge Function bridge error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Email dispatch failed.",
      },
      { status: 500 }
    );
  }
}
