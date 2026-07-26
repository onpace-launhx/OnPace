import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const proposal = body?.proposal;
    const choice = body?.choice === "alternative" ? "alternative" : "original";
    if (!proposal || typeof proposal.title !== "string" || !proposal.title.trim()) {
      return NextResponse.json({ error: "A valid proposal is required." }, { status: 400 });
    }

    if (proposal.type === "task") {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: proposal.title.trim().slice(0, 180),
          priority: ["low", "medium", "high"].includes(proposal.priority)
            ? proposal.priority
            : "medium",
          status: "todo",
          estimated_minutes: 30,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, type: "task", item: data });
    }

    if (proposal.type !== "calendar") {
      return NextResponse.json({ error: "Unsupported proposal type." }, { status: 400 });
    }

    const selectedStart =
      choice === "alternative" && proposal.conflict?.alternativeStart
        ? proposal.conflict.alternativeStart
        : proposal.startTime;
    const durationMinutes = Math.min(
      480,
      Math.max(15, Number(proposal.durationMinutes) || 60)
    );
    if (typeof selectedStart !== "string" || !ISO_DATE.test(selectedStart)) {
      return NextResponse.json({ error: "A valid calendar start time is required." }, { status: 400 });
    }
    const start = new Date(selectedStart);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "A valid calendar start time is required." }, { status: 400 });
    }
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        title: proposal.title.trim().slice(0, 180),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration: durationMinutes,
        is_ai_scheduled: true,
        sync_origin: "onpace",
        sync_status: "local_only",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { data: googleToken } = await supabase
      .from("user_google_tokens")
      .select("scope")
      .eq("user_id", user.id)
      .maybeSingle();
    return NextResponse.json({
      success: true,
      type: "calendar",
      item: data,
      shouldSync: Boolean(
        googleToken?.scope?.includes("https://www.googleapis.com/auth/calendar")
      ),
    });
  } catch (error) {
    console.error("Assistant action commit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the action." },
      { status: 500 }
    );
  }
}
