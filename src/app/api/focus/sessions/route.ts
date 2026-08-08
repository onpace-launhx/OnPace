import { NextResponse } from "next/server";
import { hasActiveFocusEntitlement } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

const profileFields = "role, plan, trial_ends_at, pro_expires_at, subscription_status";

async function getAuthorizedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(profileFields)
    .eq("id", user.id)
    .maybeSingle();

  if (!hasActiveFocusEntitlement(profile)) {
    return {
      supabase,
      user: null,
      error: NextResponse.json(
        { error: "An active Focus Mode entitlement is required." },
        { status: 403 }
      ),
    };
  }

  return { supabase, user, error: null };
}

export async function GET(request: Request) {
  const access = await getAuthorizedUser();
  if (access.error || !access.user) return access.error!;

  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") || 100);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.floor(requestedLimit), 100))
    : 100;

  const { data, error } = await access.supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data || [] });
}

export async function POST(request: Request) {
  const access = await getAuthorizedUser();
  if (access.error || !access.user) return access.error!;

  const body = await request.json().catch(() => null);
  const durationSeconds = Number(body?.duration_seconds);
  const mode = body?.mode;
  const completed = body?.completed === true;

  if (
    !Number.isInteger(durationSeconds) ||
    durationSeconds < 2 ||
    durationSeconds > 86_400 ||
    (mode !== "study" && mode !== "break")
  ) {
    return NextResponse.json({ error: "Invalid focus session." }, { status: 400 });
  }

  const { data, error } = await access.supabase
    .from("focus_sessions")
    .insert({
      user_id: access.user.id,
      duration_seconds: durationSeconds,
      mode,
      completed,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}
