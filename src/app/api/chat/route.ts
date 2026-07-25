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

    // Call secure RPC or query system settings for active AI key
    let apiKey = process.env.GEMINI_API_KEY;
    let provider = "gemini";

    try {
      const { data: config } = await supabase.rpc("get_active_ai_config");
      if (config) {
        const activeConfig = Array.isArray(config) ? config[0] : config;
        if (activeConfig?.api_key) {
          apiKey = activeConfig.api_key;
          provider = activeConfig.provider || "gemini";
        }
      }
    } catch {
      // Ignore RPC error
    }

    if (!apiKey) {
      const { data: settings } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      apiKey = settings?.resend_api_key || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    }

    const { message, history = [] } = await request.json();

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("language, full_name, learning_styles")
      .eq("id", user.id)
      .maybeSingle();

    const userLang = userProfile?.language || "en";
    const currentDate = new Date().toISOString();
    const userName = userProfile?.full_name || "Student";

    const systemPrompt = `You are the OnPace Study Coach, an intelligent, empathetic, highly motivating and interactive AI study assistant designed for students.
The student's name is: ${userName}.
The current timestamp is: ${currentDate}.
Keep your responses helpful, highly structured, encouraging, and clear.

CRITICAL LANGUAGE INSTRUCTION: The user's active interface language preference is '${userLang}'. You MUST ALWAYS respond fluently in '${userLang}' (e.g. if 'tr' write in natural Turkish, if 'zh' in natural Chinese, if 'es' in Spanish, if 'en' in English) unless the user explicitly asks you to converse in another language.

For greetings (like "merhaba", "selam", "hello", "hi"):
Warmly greet the student in '${userLang}', mention that you are their OnPace AI Study Coach, and ask how you can help them plan their studies, tasks, or exams today.

CRITICAL FUNCTIONALITY: Before scheduling any new calendar event or study session (add_calendar_event), or creating a task (add_task), propose the details to the user and ask for explicit confirmation.`;

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
              title: { type: "string", description: "The description of the study task." },
              priority: { type: "string", enum: ["high", "medium", "low"], description: "Priority of the task." },
              due_date: { type: "string", description: "Optional ISO date string for due date." }
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
          name: "add_calendar_event",
          description: "Add a study session to the OnPace internal calendar.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Title of the study session." },
              start_time: { type: "string", description: "ISO 8601 start date/time." },
              end_time: { type: "string", description: "ISO 8601 end date/time." }
            },
            required: ["title", "start_time", "end_time"]
          }
        }
      }
    ];

    async function executeTool(name: string, args: any) {
      if (!user) return { error: "Unauthorized" };
      try {
        if (name === "get_tasks") {
          const { data } = await supabase
            .from("tasks")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
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
          const { data } = await supabase
            .from("study_sessions")
            .select("*")
            .eq("user_id", user.id)
            .order("start_time", { ascending: true });
          return { events: data || [] };
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
          return { success: true, event: data };
        }
      } catch (err: any) {
        return { error: err.message || "Tool execution failed" };
      }
      return { error: "Unknown tool call" };
    }

    let reply = "";

    // Primary Call: OpenAI if configured
    if (provider === "openai" && apiKey && apiKey.startsWith("sk-")) {
      try {
        const messages: any[] = [
          { role: "system", content: systemPrompt },
          ...history.map((msg: any) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text || msg.content || ""
          })),
          { role: "user", content: message }
        ];

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

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const assistantMessage = openaiData.choices?.[0]?.message;

          if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
            messages.push(assistantMessage);
            for (const toolCall of assistantMessage.tool_calls) {
              const functionName = toolCall.function.name;
              const functionArgs = JSON.parse(toolCall.function.arguments || "{}");
              const result = await executeTool(functionName, functionArgs);
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: functionName,
                content: JSON.stringify(result)
              });
            }

            const secondResponse = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ model: "gpt-4o-mini", messages }),
            });

            if (secondResponse.ok) {
              const secondData = await secondResponse.json();
              reply = secondData.choices?.[0]?.message?.content || "";
            }
          } else {
            reply = assistantMessage?.content || "";
          }
        }
      } catch (e) {
        console.warn("OpenAI API call failed, falling back to Gemini:", e);
      }
    }

    // Fallback or Direct Call: Gemini 1.5 Flash
    if (!reply) {
      const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (geminiKey) {
        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...history.map((msg: any) => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.text || msg.content || "" }]
          })),
          { role: "user", parts: [{ text: message }] }
        ];

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      }
    }

    // Ultimate Fallback Response in User Language
    if (!reply || reply.trim().length === 0) {
      if (userLang === "tr") {
        reply = `Selam ${userName}! Ben OnPace Yapay Zeka Çalışma Koçun. Bugün derslerini ve görevlerini planlamana nasıl yardımcı olabilirim?`;
      } else if (userLang === "es") {
        reply = `¡Hola ${userName}! Soy tu tutor de estudio OnPace AI. ¿En qué puedo ayudarte hoy a planificar tus tareas o exámenes?`;
      } else if (userLang === "zh") {
        reply = `你好 ${userName}！我是你的 OnPace AI 学习教练。今天我能为你安排课程、任务或考试计划提供什么帮助？`;
      } else {
        reply = `Hey ${userName}! I'm your OnPace AI Study Coach. How can I assist you with your tasks, notes, or study schedule today?`;
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
