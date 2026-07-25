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

    // Call secure RPC to fetch the active AI key and provider on the server side
    const { data: config, error: rpcError } = await supabase.rpc("get_active_ai_config");

    if (rpcError) {
      console.error("Supabase RPC error calling get_active_ai_config:", rpcError);
      return NextResponse.json(
        { error: "AI configurations not loaded." },
        { status: 400 }
      );
    }

    const activeConfig = Array.isArray(config) ? config[0] : config;
    const apiKey = activeConfig?.api_key;
    const provider = activeConfig?.provider || "gemini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI Key missing in system settings." },
        { status: 400 }
      );
    }

    const { message, history } = await request.json();

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("language, full_name, learning_styles")
      .eq("id", user.id)
      .maybeSingle();

    const userLang = userProfile?.language || "en";
    const currentDate = new Date().toISOString();
    const systemPrompt = `You are the OnPace Study Coach, an intelligent, motivating and interactive AI study assistant designed for students.
The current timestamp is: ${currentDate}.
Keep your responses helpful, highly structured, encouraging, and relatively concise (under 250 words) to save API costs.
You have tools to fetch/insert/update/delete tasks, calendar events, study notes, and quiz performances directly. 

CRITICAL LANGUAGE INSTRUCTION: The user's active interface language preference is '${userLang}'. You MUST ALWAYS respond fluently in '${userLang}' (e.g. if 'zh' write in natural Chinese, if 'tr' in Turkish, if 'es' in Spanish, if 'en' in English) unless the user explicitly asks you to converse in another language.

CRITICAL FUNCTIONALITY: Before scheduling any new calendar event or study session (add_calendar_event), or creating a task (add_task), you MUST first propose the details to the user (title, date/time, duration) and ask them for explicit confirmation (e.g. "I am scheduling your Math Study Session for tomorrow at 4 PM, is this correct?").
If the associated course/class is not clear, ask the user to select or choose which course it belongs to. If the task description is ambiguous, ask them to choose or clarify. Make the scheduling flow interactive.
Do not output code blocks unless asked.`;

    // Define function calling tools
    const tools = [
      {
        type: "function",
        function: {
          name: "get_tasks",
          description: "Fetch the user's current study tasks and todo checklist items."
        }
      },
      {
        type: "function",
        function: {
          name: "add_task",
          description: "Add a new study task to the user's checklist/todo list.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "The description of the study task (e.g. Read Hamlet chapter 2)." },
              priority: { type: "string", enum: ["high", "medium", "low"], description: "The priority of the task. Defaults to medium." },
              due_date: { type: "string", description: "Optional ISO 8601 date string for when the task is due." }
            },
            required: ["title"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_calendar_events",
          description: "Fetch the user's scheduled study sessions stored in OnPace."
        }
      },
      {
        type: "function",
        function: {
          name: "get_notes_directory",
          description: "Fetch the user's uploaded study notes, OCR summaries, and flashcards."
        }
      },
      {
        type: "function",
        function: {
          name: "get_quiz_performances",
          description: "Fetch the user's recent practice quiz results and accuracy scores."
        }
      },
      {
        type: "function",
        function: {
          name: "add_calendar_event",
          description: "Add a study session to the OnPace internal calendar.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "The title of the study session." },
              start_time: { type: "string", description: "ISO 8601 start date/time." },
              end_time: { type: "string", description: "ISO 8601 end date/time." }
            },
            required: ["title", "start_time", "end_time"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "list_google_calendar_events",
          description: "List the user's upcoming events from their connected Google Calendar. Use this when the user asks about their real Google Calendar schedule, appointments, or events."
        }
      },
      {
        type: "function",
        function: {
          name: "add_google_calendar_event",
          description: "Create a new event in the user's real Google Calendar. Use when the user wants to schedule something on Google Calendar.",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Event title/name." },
              start: { type: "string", description: "ISO 8601 start date-time (e.g. 2026-07-25T14:00:00Z)." },
              end: { type: "string", description: "ISO 8601 end date-time (e.g. 2026-07-25T15:00:00Z)." },
              description: { type: "string", description: "Optional event description." }
            },
            required: ["summary", "start", "end"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_google_calendar_event",
          description: "Delete an event from the user's Google Calendar by its event ID.",
          parameters: {
            type: "object",
            properties: {
              eventId: { type: "string", description: "The Google Calendar event ID to delete." }
            },
            required: ["eventId"]
          }
        }
      }
    ];

    // Tool execution handler
    async function executeTool(name: string, args: any) {
      if (!user) return { error: "Unauthorized" };
      try {

        if (name === "get_tasks") {
          const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (error) return { error: error.message };
          return { tasks: data || [] };
        }
        if (name === "add_task") {
          const { data, error } = await supabase
            .from("tasks")
            .insert({
              user_id: user.id,
              title: args.title,
              priority: args.priority || "medium",
              due_date: args.due_date || null,
              status: "todo"
            })
            .select("*")
            .single();
          if (error) return { error: error.message };
          return { success: true, task: data };
        }
        if (name === "get_calendar_events") {
          const { data, error } = await supabase
            .from("study_sessions")
            .select("*")
            .eq("user_id", user.id)
            .order("start_time", { ascending: true });
          if (error) return { error: error.message };
          return { events: data || [] };
        }
        if (name === "get_notes_directory") {
          const { data, error } = await supabase
            .from("notes")
            .select("id, title, content, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);
          if (error) return { error: error.message };
          return { notes: data || [] };
        }
        if (name === "get_quiz_performances") {
          const { data, error } = await supabase
            .from("quizzes")
            .select("id, score, questions, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);
          if (error) return { error: error.message };
          return { quizzes: data || [] };
        }
        if (name === "add_calendar_event") {
          const { data, error } = await supabase
            .from("study_sessions")
            .insert({
              user_id: user.id,
              title: args.title,
              start_time: args.start_time,
              end_time: args.end_time,
              is_ai_scheduled: true
            })
            .select("*")
            .single();
          if (error) return { error: error.message };

          // Sync to Google Calendar automatically if connected
          try {
            const { data: googleToken } = await supabase
              .from("user_google_tokens")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle();

            if (googleToken) {
              let accessToken = googleToken.access_token;
              const now = new Date();
              const expiresAt = new Date(googleToken.expires_at);

              if (expiresAt <= now) {
                const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: googleToken.refresh_token,
                    grant_type: "refresh_token",
                  }),
                });
                const refreshData = await refreshRes.json();
                if (refreshData.access_token) {
                  accessToken = refreshData.access_token;
                  const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();
                  await supabase
                    .from("user_google_tokens")
                    .update({
                      access_token: accessToken,
                      expires_at: newExpiresAt,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", user.id);
                }
              }

              await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  summary: args.title,
                  description: "Scheduled via OnPace AI Coach",
                  start: { dateTime: args.start_time, timeZone: "UTC" },
                  end: { dateTime: args.end_time, timeZone: "UTC" },
                }),
              });
            }
          } catch (e) {
            console.error("Auto Google Calendar sync failed:", e);
          }

          return { success: true, event: data };
        }
        // ── Google Calendar tools ──────────────────────────────────────────
        if (name === "list_google_calendar_events") {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const calRes = await fetch(`${baseUrl}/api/calendar/list`, {
            headers: { Cookie: request.headers.get("cookie") || "" }
          });
          const calData = await calRes.json();
          if (!calData.connected) return { error: "Google Calendar not connected. Ask the user to connect it via the assistant widget." };
          return { events: calData.events };
        }
        if (name === "add_google_calendar_event") {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const addRes = await fetch(`${baseUrl}/api/calendar/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || ""
            },
            body: JSON.stringify(args)
          });
          const addData = await addRes.json();
          return addData;
        }
        if (name === "delete_google_calendar_event") {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const delRes = await fetch(`${baseUrl}/api/calendar/delete`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || ""
            },
            body: JSON.stringify({ eventId: args.eventId })
          });
          const delData = await delRes.json();
          return delData;
        }
      } catch (err: any) {
        return { error: err.message || "Failed to execute database action." };
      }
      return { error: "Unknown tool call" };
    }

    let reply = "";

    if (provider === "openai") {
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: message }
      ];

      // Request completions with tools schema
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          tools,
          tool_choice: "auto"
        }),
      });

      let openaiData = await openaiResponse.json();
      let assistantMessage = openaiData.choices?.[0]?.message;

      if (!assistantMessage || (!assistantMessage.content && (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0))) {
        // Model returned empty output without tool calls – provide a friendly fallback response
        reply = "Sorry, I couldn't understand your request. Please try rephrasing or provide more details.";
      } else if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Existing tool call handling unchanged – moved to this block for clarity
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || "{}");
          
          // Run actual Supabase operations
          const result = await executeTool(functionName, functionArgs);
          
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: functionName,
            content: JSON.stringify(result)
          });
        }

        // Fetch final model response with tool output appended
        const secondResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages
          }),
        });

        const secondData = await secondResponse.json();
        reply = secondData.choices?.[0]?.message?.content || "";
      } else {
        // No tool calls, just regular content
        reply = assistantMessage?.content || "";
      }

      if (!reply) {
        console.error("OpenAI Completion Generation Failure response details:", openaiData);
        return NextResponse.json(
          { error: "AI Study Coach could not generate a response. Please try again." },
          { status: 500 }
        );
      }
    } else {
      // Call Gemini 1.5 Flash (fallback to text content)
      const contents = [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...history.map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        })),
        { role: "user", parts: [{ text: message }] }
      ];

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        }
      );

      const geminiData = await geminiResponse.json();
      reply = geminiData.candidates?.[0]?.content?.parts[0]?.text || "";

      if (!reply) {
        return NextResponse.json(
          { error: "AI Study Coach could not generate a response. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("Server Exception inside /api/chat:", error);
    return NextResponse.json(
      { error: "An internal server error occurred. Please try again." },
      { status: 500 }
    );
  }
}
