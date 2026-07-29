import "server-only";

import { cookies } from "next/headers";
import {
  REMEMBER_SESSION_COOKIE,
  REMEMBER_SESSION_MAX_AGE,
} from "@/lib/auth/remember-session";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

export function hasRememberedSession(cookieStore: CookieStore) {
  return cookieStore.get(REMEMBER_SESSION_COOKIE)?.value === "1";
}

export function applySessionPersistence(
  cookieStore: CookieStore,
  remember: boolean
) {
  const secure = process.env.NODE_ENV === "production";
  const authCookies = cookieStore
    .getAll()
    .filter(({ name }) => isSupabaseAuthCookie(name));

  for (const { name, value } of authCookies) {
    cookieStore.set({
      name,
      value,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure,
      ...(remember ? { maxAge: REMEMBER_SESSION_MAX_AGE } : {}),
    });
  }

  cookieStore.set({
    name: REMEMBER_SESSION_COOKIE,
    value: remember ? "1" : "0",
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure,
    ...(remember ? { maxAge: REMEMBER_SESSION_MAX_AGE } : {}),
  });
}
