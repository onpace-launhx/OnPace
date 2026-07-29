import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/achievements/:path*",
    "/ai-assistant/:path*",
    "/billing/:path*",
    "/calendar/:path*",
    "/exam-planner/:path*",
    "/focus/:path*",
    "/notes/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/rewards/:path*",
    "/study-groups/:path*",
    "/tasks/:path*",
    "/admin/:path*",
    "/maintenance/:path*",
  ],
};
