import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StoredMessage = {
  id: string;
  role?: string | null;
  sender?: string | null;
  content?: string | null;
  text?: string | null;
  message?: string | null;
};

function normalizeMessage(message: StoredMessage) {
  return {
    id: message.id,
    sender: message.role === "user" || message.sender === "user" ? "user" : "ai",
    text: String(message.content || message.text || message.message || ""),
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim();
    if (!sessionId) {
      const { data, error } = await supabase
        .from("ai_chat_sessions")
        .select("id,title,created_at,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50);
      if (error) throw error;
      return NextResponse.json({ sessions: data || [] });
    }

    const { data: session, error: sessionError } = await supabase
      .from("ai_chat_sessions")
      .select("id,title,created_at,updated_at")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("ai_chat_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ session, messages: (data || []).map(normalizeMessage).filter((message) => message.text.trim()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load chat history." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
    const { data, error } = await supabase
      .from("ai_chat_sessions")
      .insert({ user_id: user.id, title: title || "New study chat" })
      .select("id,title,created_at,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ session: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create chat." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim();
    if (!sessionId) return NextResponse.json({ error: "Chat id is required" }, { status: 400 });
    const { error } = await supabase.from("ai_chat_sessions").delete().eq("id", sessionId).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete chat." }, { status: 500 });
  }
}
