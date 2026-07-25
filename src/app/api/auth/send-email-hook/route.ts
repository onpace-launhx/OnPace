import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Compatibility bridge for projects that still point the Supabase Auth hook at
 * the web app. Resend is called only by the Supabase Edge Function. New
 * deployments should configure the Auth hook with the Edge Function URL
 * directly and can then remove this route.
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase URL is not configured." },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headers = new Headers();
  headers.set("Content-Type", request.headers.get("Content-Type") || "application/json");
  // This compatibility route is called by Supabase Auth, not by a browser
  // session. The deployed Edge Function still verifies the webhook signature.
  headers.set("apikey", supabaseAnonKey);

  for (const name of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/auth-email-hook`,
    {
      method: "POST",
      headers,
      body,
    }
  );
  const responseBody = await response.text();

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/json",
    },
  });
}
