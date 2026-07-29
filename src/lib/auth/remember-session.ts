export const REMEMBER_SESSION_COOKIE = "onpace_remember_session";
export const REMEMBER_SESSION_MAX_AGE = 400 * 24 * 60 * 60;

function secureCookieSuffix() {
  return window.location.protocol === "https:" ? "; Secure" : "";
}

export function setRememberSessionIntent(remember: boolean) {
  if (typeof window === "undefined") return;

  const persistence = remember
    ? `; Max-Age=${REMEMBER_SESSION_MAX_AGE}`
    : "";

  document.cookie = `${REMEMBER_SESSION_COOKIE}=${remember ? "1" : "0"}; Path=/; SameSite=Lax${persistence}${secureCookieSuffix()}`;
}

export function clearRememberSessionIntent() {
  if (typeof window === "undefined") return;

  document.cookie = `${REMEMBER_SESSION_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${secureCookieSuffix()}`;
}
