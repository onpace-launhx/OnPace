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

    const { token } = await request.json();
    if (typeof token !== "string" || token.length < 24) {
      return NextResponse.json({ error: "Invalid reward link" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("claim_email_reward", {
      claim_token: token,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const reward = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ success: true, reward });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Reward could not be claimed",
      },
      { status: 500 }
    );
  }
}
