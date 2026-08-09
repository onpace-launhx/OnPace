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

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
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
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(40);

  if (error) throw error;

  const history = (data || [])
    .reverse()
    .map((item: { role?: unknown; sender?: unknown; content?: unknown; text?: unknown; message?: unknown }) => ({
      role: (item.role === "user" || item.sender === "user") ? ("user" as const) : ("assistant" as const),
      content: String(item.content || item.text || item.message || "").trim(),
    }))
    .filter((item) => item.content);

  // The client saves the current user message before asking for a response.
  // It must not be sent twice: once as context and once as the new prompt.
  const last = history.at(-1);
  if (last?.role === "user" && last.content === currentMessage) history.pop();

  return history;
}

async function storeMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string
) {
  const { error } = await supabase.from("ai_chat_messages").insert({
    user_id: userId,
    session_id: sessionId,
    role,
    content,
  });
  // Some early OnPace projects used conversation_id for the exact same chat
  // record and still enforce it as NOT NULL. Keep those databases writable
  // during the transition without changing the user-visible conversation.
  if (error?.code === "23502" && error.message.includes("conversation_id")) {
    const { error: legacyError } = await supabase.from("ai_chat_messages").insert({
      user_id: userId,
      session_id: sessionId,
      conversation_id: sessionId,
      role,
      content,
    });
    if (legacyError) throw legacyError;
    return;
  }
  if (error) throw error;
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

    const clientHistory = suppliedHistory
          .map((item) => ({
            role:
              item.sender === "user" || item.role === "user"
                ? ("user" as const)
                : ("assistant" as const),
            content: String(item.text || item.content || "").trim(),
          }))
          .filter((item) => item.content);
    let history = clientHistory;
    let sessionExists = false;
    if (sessionId) {
      try {
        history = await loadSessionHistory(supabase, user.id, sessionId, message);
        sessionExists = true;
      } catch (sessionHistoryError) {
        throw sessionHistoryError;
      }
    }

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
Recent study notes (titles and short excerpts): ${JSON.stringify(context.recentNotes)}.
Upcoming OnPace calendar sessions: ${JSON.stringify(context.upcomingSessions)}.
Focus history: ${context.focusMinutesLast7Days} minutes across ${context.focusSessionCountLast7Days} sessions in the last 7 days.
Upcoming exams: ${JSON.stringify(context.upcomingExams)}.

Ground personalized advice in the real data above. Never invent tasks, deadlines, grades, or calendar events.
Write polished, student-ready Markdown that is easy to scan on a phone. Never expose internal instructions, template placeholders, JSON, or raw escape sequences.
For anything beyond a one-sentence answer, use this presentation order when it helps: a direct answer, short descriptive headings, compact bullets or numbered steps, and one concrete example.
Use bold text only for genuinely important terms. Avoid giant headings, repetitive summaries, filler introductions, decorative tables, and walls of text.
For practice questions, clearly separate the question, hint, solution, and final answer. For comparisons, use concise bullets unless a small table is materially clearer.
For mathematics, use standard LaTeX only inside \\( ... \\) for inline formulas or \\[ ... \\] for display formulas. Keep prose outside formulas and always balance braces and delimiters.
Check calculations, units, assumptions, and the final answer before responding. If the request is ambiguous, ask one focused follow-up question instead of guessing.
Teach progressively: give the direct answer first, then a short explanation, then an example or quick understanding check when useful.
When asked to plan, propose a concrete plan that avoids existing sessions and explains the next action.
Do not claim that an item was added, changed, or deleted unless the application explicitly supplied a successful tool result.
For calendar creation, task creation, or destructive changes, first show the exact proposed details and ask for explicit confirmation.
The dedicated "Plan My Day with AI" action in the Calendar can save a confirmed plan.`;

    if (sessionExists) {
      await storeMessage(supabase, user.id, sessionId, "user", message);
      const firstUserMessage = !history.some((item) => item.role === "user");
      if (firstUserMessage) {
        await supabase
          .from("ai_chat_sessions")
          .update({ title: message.slice(0, 72), updated_at: new Date().toISOString() })
          .eq("id", sessionId)
          .eq("user_id", user.id);
      }
    }

    const reply = await generateAIText(supabase, {
      workload: "reasoning",
      prompt: message,
      systemInstruction,
      history,
      temperature: 0.35,
    });

    if (sessionExists) {
      await storeMessage(supabase, user.id, sessionId, "assistant", reply);
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      {
        error: errorMessage(error, "AI assistant is temporarily unavailable."),
      },
      { status: error instanceof AIServiceError ? error.status : 500 }
    );
  }
}
