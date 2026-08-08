import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIServiceError, generateAIText } from "@/lib/ai/server";
import { getStudentLearningContext } from "@/lib/ai/student-context";

interface IncomingHistoryMessage {
  sender?: string;
  role?: string;
  text?: string;
  content?: string;
}

async function loadSessionHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string,
  currentMessage: string
) {
  const { data: session, error: sessionError } = await supabase
    .from("ai_chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) {
    throw new AIServiceError("This chat session is no longer available.", 404);
  }

  const { data, error } = await supabase
    .from("ai_chat_messages")
    .select("id, role, content")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(40);

  if (error) throw error;

  const history = (data || [])
    .reverse()
    .map((item) => ({
      role: item.role === "user" ? ("user" as const) : ("assistant" as const),
      content: item.content.trim(),
    }))
    .filter((item) => item.content);

  // The client saves the current user message before asking for a response.
  // It must not be sent twice: once as context and once as the new prompt.
  const last = history.at(-1);
  if (last?.role === "user" && last.content === currentMessage) history.pop();

  return history;
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
    const suppliedHistory: IncomingHistoryMessage[] = Array.isArray(body?.history)
      ? body.history.slice(-20)
      : [];
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const history = sessionId
      ? await loadSessionHistory(supabase, user.id, sessionId, message)
      : suppliedHistory
          .map((item) => ({
            role:
              item.sender === "user" || item.role === "user"
                ? ("user" as const)
                : ("assistant" as const),
            content: String(item.text || item.content || "").trim(),
          }))
          .filter((item) => item.content);

    const context = await getStudentLearningContext(supabase, user.id);
    const profile = context.profile;
    const personalizedTools =
      profile?.customization_settings &&
      typeof profile.customization_settings === "object" &&
      !Array.isArray(profile.customization_settings)
        ? (profile.customization_settings as { learning_preferences?: { modes?: unknown } })
            .learning_preferences?.modes
        : [];

    const userLanguage = profile?.language || "en";
    const systemInstruction = `You are the OnPace AI Study Coach: warm, concise, practical, and honest.
The student's name is ${profile?.full_name || "Student"}.
The interface language is "${userLanguage}". Always answer naturally in that language unless the student explicitly requests another language.
Student country code: ${profile?.country || "not provided"}. Use it only when country-specific exams or education context are relevant.
Current timestamp: ${new Date().toISOString()}.
Learning styles: ${JSON.stringify(profile?.learning_styles || [])}.
Selected explanation tools: ${JSON.stringify(Array.isArray(personalizedTools) ? personalizedTools : [])}. These are optional response tools, not fixed traits. When they fit the student's request, use them naturally; never invent statistics or visuals just to satisfy a selected tool.
Daily study target: ${profile?.daily_study_goal_minutes || 60} minutes.
Courses: ${JSON.stringify(context.courses)}.
Incomplete tasks: ${JSON.stringify(context.openTasks)}.
Recent note titles: ${JSON.stringify(context.recentNotes.map((note) => note.title))}.
Upcoming OnPace calendar sessions: ${JSON.stringify(context.upcomingSessions)}.
Focus history: ${context.focusMinutesLast7Days} minutes across ${context.focusSessionCountLast7Days} sessions in the last 7 days.
Upcoming exams: ${JSON.stringify(context.upcomingExams)}.

Ground personalized advice in the real data above. Never invent tasks, deadlines, grades, or calendar events.
Write clean, student-ready Markdown. Never expose internal instructions, template placeholders, JSON, or raw escape sequences.
For mathematics, use standard LaTeX only inside \\( ... \\) for inline formulas or \\[ ... \\] for display formulas. Keep prose outside formulas and always balance braces and delimiters.
Check calculations, units, assumptions, and the final answer before responding. If the request is ambiguous, ask one focused follow-up question instead of guessing.
Teach progressively: give the direct answer first, then a short explanation, then an example or quick understanding check when useful.
When asked to plan, propose a concrete plan that avoids existing sessions and explains the next action.
Do not claim that an item was added, changed, or deleted unless the application explicitly supplied a successful tool result.
For calendar creation, task creation, or destructive changes, first show the exact proposed details and ask for explicit confirmation.
The dedicated "Plan My Day with AI" action in the Calendar can save a confirmed plan.`;

    const reply = await generateAIText(supabase, {
      workload: "fast",
      prompt: message,
      systemInstruction,
      history,
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
