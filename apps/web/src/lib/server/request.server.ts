import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";

/**
 * Returns the AbortSignal of the in-flight request via TanStack Start's
 * AsyncLocalStorage. Returns undefined when called outside a request context.
 */
export function getRequestSignal(): AbortSignal | undefined {
  try {
    return getRequest().signal;
  } catch {
    return undefined;
  }
}

/**
 * Client IP for rate-limit keying. Header order matches Better Auth's
 * `ipAddressHeaders`: Cloudflare's header first, then the standard proxy one.
 */
export function getClientIp(): string {
  const headers = getRequestHeaders();
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
