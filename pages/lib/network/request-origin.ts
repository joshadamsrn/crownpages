import type { NextRequest } from "next/server";

function normalizeHost(value: string | null, protocol: string) {
  const host = value?.split(",", 1)[0]?.trim();
  if (!host) return null;

  try {
    const parsed = new URL(`${protocol}//${host}`);
    if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) {
      return null;
    }
    return parsed.host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Reject cross-site browser mutations while honoring the public host preserved
 * by reverse proxies such as Netlify. nextUrl.host can be an internal runtime
 * host, so it must not be the only same-origin signal.
 */
export function hasValidRequestOrigin(request: Pick<NextRequest, "headers" | "nextUrl">) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.protocol !== "https:" && parsedOrigin.protocol !== "http:") return false;

    const originHost = parsedOrigin.host.toLowerCase();
    const requestHosts = [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      request.nextUrl.host,
    ];

    return requestHosts.some((host) => normalizeHost(host, parsedOrigin.protocol) === originHost);
  } catch {
    return false;
  }
}
