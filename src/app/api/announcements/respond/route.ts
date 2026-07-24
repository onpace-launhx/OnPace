import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: Submit a response to an announcement/feedback form
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { announcement_id, responses } = await request.json();

    if (!announcement_id) {
      return NextResponse.json({ error: "announcement_id is required." }, { status: 400 });
    }

    // Check if user already responded
    const { data: existing } = await supabase
      .from("announcement_responses")
      .select("id")
      .eq("announcement_id", announcement_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You have already responded to this form." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("announcement_responses")
      .insert({
        announcement_id,
        user_id: user.id,
        responses: responses || {}
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, response: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
