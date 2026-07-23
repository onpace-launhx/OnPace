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
      
      // Log failure in system_logs
      const { error: logErr } = await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: "Failed to fetch active AI configuration via RPC",
        details: JSON.stringify(rpcError)
      });
      if (logErr) {
        console.error("Failed to write to system_logs:", logErr);
      }

      return NextResponse.json(
        { error: "We are sorry, an error occurred while processing your study assistant request. Please try again later." },
        { status: 400 }
      );
    }

    // Since RPC returns a table/array, extract the first row
    const activeConfig = Array.isArray(config) ? config[0] : config;
    const apiKey = activeConfig?.api_key;
    const provider = activeConfig?.provider || "gemini";

    if (!apiKey) {
      // Log missing key error
      const { error: logErr } = await supabase.from("system_logs").insert({
        user_id: user.id,
        error_message: `Active AI Key (${provider}) is empty in system settings.`,
        details: "api_key is null or empty"
      });
      if (logErr) {
        console.error("Failed to write to system_logs:", logErr);
      }

      return NextResponse.json(
        { error: "We are sorry, an error occurred while processing your study assistant request. Please try again later." },
        { status: 400 }
      );
    }

    const { message, history } = await request.json();

    const systemPrompt = `You are the OnPace Study Coach, an intelligent and motivating AI study assistant designed for high school students.
Keep your responses helpful, highly structured, encouraging, and relatively concise (under 250 words) to save API costs.
Focus on helping the student organize their tasks, learn concepts, and plan schedules. Do not output code blocks unless asked.`;

    let reply = "";

    if (provider === "openai") {
      // Call OpenAI completions API (using cost-efficient gpt-4o-mini)
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map((msg: any) => ({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.text
            })),
            { role: "user", content: message }
          ]
        }),
      });

      const openaiData = await openaiResponse.json();

      if (openaiData.choices && openaiData.choices[0]?.message?.content) {
        reply = openaiData.choices[0].message.content;
      } else {
        console.error("OpenAI API Failure Response:", openaiData);
        
        await supabase.from("system_logs").insert({
          user_id: user.id,
          error_message: "OpenAI Completion Generation Failure",
          details: JSON.stringify(openaiData)
        });

        return NextResponse.json(
          { error: "We are sorry, an error occurred while generating study response. Please try again." },
          { status: 500 }
        );
      }
    } else {
      // Call Gemini 1.5 Flash API endpoint
      const contents = [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        ...history.map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        })),
        {
          role: "user",
          parts: [{ text: message }]
        }
      ];

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contents }),
        }
      );

      const geminiData = await geminiResponse.json();

      if (geminiData.candidates && geminiData.candidates[0]?.content?.parts[0]?.text) {
        reply = geminiData.candidates[0].content.parts[0].text;
      } else {
        console.error("Gemini API Failure Response:", geminiData);

        await supabase.from("system_logs").insert({
          user_id: user.id,
          error_message: "Gemini Response Generation Failure",
          details: JSON.stringify(geminiData)
        });

        return NextResponse.json(
          { error: "We are sorry, an error occurred while generating study response. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("Server Exception inside /api/chat:", error);
    
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("system_logs").insert({
        user_id: user?.id || null,
        error_message: "Internal Server Exception inside /api/chat",
        details: error.message || "Unknown exception message"
      });
    } catch (dbErr) {
      console.error("Failed to write exception to system_logs:", dbErr);
    }

    return NextResponse.json(
      { error: "We are sorry, an internal server error occurred. Please contact support." },
      { status: 500 }
    );
  }
}
