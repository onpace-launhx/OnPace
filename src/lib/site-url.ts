const PRODUCTION_SITE_ORIGIN = "https://onpace-ai.xyz";

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function isLocalOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getSiteOrigin(requestOrigin?: string) {
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

  if (
    process.env.NODE_ENV !== "production" &&
    normalizedRequestOrigin &&
    isLocalOrigin(normalizedRequestOrigin)
  ) {
    return normalizedRequestOrigin;
  }

  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    PRODUCTION_SITE_ORIGIN
  );
}

export function getBrowserSiteOrigin() {
  return getSiteOrigin(
    typeof window === "undefined" ? undefined : window.location.origin
  );
}

export function siteUrl(path: string, requestOrigin?: string) {
  return new URL(path, getSiteOrigin(requestOrigin));
}
