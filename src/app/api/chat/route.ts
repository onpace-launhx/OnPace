import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIServiceError, generateAIText } from "@/lib/ai/server";

interface IncomingHistoryMessage {
  sender?: string;
  role?: string;
  text?: string;
  content?: string;
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

    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const history: IncomingHistoryMessage[] = Array.isArray(body?.history)
      ? body.history.slice(-20)
      : [];
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const [
      { data: profile },
      { data: tasks },
      { data: sessions },
      { data: courses },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("language, full_name, learning_styles, daily_study_goal_minutes")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, estimated_minutes")
        .eq("user_id", user.id)
        .neq("status", "completed")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(15),
      supabase
        .from("study_sessions")
        .select("id, title, start_time, duration")
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(10),
      supabase
        .from("courses")
        .select("name")
        .eq("user_id", user.id)
        .limit(20),
    ]);

    const userLanguage = profile?.language || "en";
    const systemInstruction = `You are the OnPace AI Study Coach: warm, concise, practical, and honest.
The student's name is ${profile?.full_name || "Student"}.
The interface language is "${userLanguage}". Always answer naturally in that language unless the student explicitly requests another language.
Current timestamp: ${new Date().toISOString()}.
Learning styles: ${JSON.stringify(profile?.learning_styles || [])}.
Daily study target: ${profile?.daily_study_goal_minutes || 60} minutes.
Courses: ${JSON.stringify((courses || []).map((course) => course.name))}.
Incomplete tasks: ${JSON.stringify(tasks || [])}.
Upcoming OnPace calendar sessions: ${JSON.stringify(sessions || [])}.

Ground personalized advice in the real data above. Never invent tasks, deadlines, grades, or calendar events.
When asked to plan, propose a concrete plan that avoids existing sessions and explains the next action.
Do not claim that an item was added, changed, or deleted unless the application explicitly supplied a successful tool result.
For calendar creation, task creation, or destructive changes, first show the exact proposed details and ask for explicit confirmation.
The dedicated "Plan My Day with AI" action in the Calendar can save a confirmed plan.`;

    const reply = await generateAIText(supabase, {
      prompt: message,
      systemInstruction,
      history: history
        .map((item) => ({
          role:
            item.sender === "user" || item.role === "user"
              ? ("user" as const)
              : ("assistant" as const),
          content: String(item.text || item.content || "").trim(),
        }))
        .filter((item) => item.content),
      temperature: 0.35,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI assistant is temporarily unavailable.",
      },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
