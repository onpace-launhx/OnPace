import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AIServiceError,
  generateAIText,
  parseAIJson,
} from "@/lib/ai/server";

interface PlannedBlock {
  title: string;
  startTime: string;
  duration: number;
  task_id?: string | null;
}

interface DayPlan {
  note: string;
  blocks: PlannedBlock[];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedDate =
      typeof body?.date === "string" ? body.date : new Date().toISOString().slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ||
      Number.isNaN(new Date(`${requestedDate}T00:00:00Z`).getTime())
    ) {
      return NextResponse.json({ error: "Invalid plan date." }, { status: 400 });
    }
    const currentLocalTime =
      typeof body?.currentLocalTime === "string" &&
      /^\d{2}:\d{2}$/.test(body.currentLocalTime)
        ? body.currentLocalTime
        : null;
    const timeZone =
      typeof body?.timeZone === "string" ? body.timeZone.slice(0, 100) : "local";

    const [{ data: profile }, { data: tasks }, { data: sessions }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("language, full_name, daily_study_goal_minutes")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("tasks")
          .select("id, title, priority, due_date, estimated_minutes, status")
          .eq("user_id", user.id)
          .neq("status", "completed")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(20),
        supabase
          .from("study_sessions")
          .select("title, start_time, duration")
          .eq("user_id", user.id)
          .gte("start_time", `${requestedDate}T00:00:00`)
          .lt("start_time", `${requestedDate}T23:59:59`)
          .order("start_time", { ascending: true }),
      ]);

    const language = profile?.language || "en";
    const prompt = `Create a realistic study plan for ${requestedDate}.
Student time zone: ${timeZone}
Current local time: ${currentLocalTime || "not supplied"}
Student: ${profile?.full_name || "Student"}
Preferred response language: ${language}
Daily study target: ${profile?.daily_study_goal_minutes || 60} minutes
Incomplete tasks: ${JSON.stringify(tasks || [])}
Existing calendar blocks that MUST NOT overlap: ${JSON.stringify(sessions || [])}

Use local 24-hour time. Prioritize urgent and high-priority tasks, include short breaks when useful, and do not schedule more than 6 blocks.
If the requested date is today, never schedule a block before the current local time.
Return ONLY JSON with this exact shape:
{
  "note": "one short personalized summary in the requested language",
  "blocks": [
    {
      "title": "localized focus block title",
      "startTime": "HH:mm",
      "duration": 45,
      "task_id": "matching task UUID or null"
    }
  ]
}`;

    const raw = await generateAIText(supabase, {
      prompt,
      temperature: 0.2,
      json: true,
    });
    const plan = parseAIJson<DayPlan>(raw);

    if (
      !plan ||
      typeof plan.note !== "string" ||
      !Array.isArray(plan.blocks) ||
      plan.blocks.some(
        (block) =>
          typeof block?.title !== "string" ||
          !/^\d{2}:\d{2}$/.test(block?.startTime) ||
          !Number.isFinite(Number(block?.duration))
      )
    ) {
      throw new AIServiceError("AI returned an invalid day plan.", 502);
    }

    return NextResponse.json({
      note: plan.note,
      blocks: plan.blocks.map((block) => ({
        ...block,
        dateStr: requestedDate,
        duration: Math.max(15, Math.min(180, Number(block.duration))),
      })),
    });
  } catch (error) {
    console.error("Plan day route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate a day plan.",
      },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
