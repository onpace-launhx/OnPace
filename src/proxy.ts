import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/achievements/:path*",
    "/ai-assistant/:path*",
    "/billing/:path*",
    "/calendar/:path*",
    "/focus/:path*",
    "/notes/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/study-groups/:path*",
    "/tasks/:path*",
    "/admin/:path*",
  ],
};
