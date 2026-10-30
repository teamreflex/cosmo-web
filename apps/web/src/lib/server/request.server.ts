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
 * Client IP for rate-limit keying, read from the same header as Better Auth's
 * `ipAddressHeaders`. `x-forwarded-for` is ignored because a client can spoof it.
 */
export function getClientIp(): string {
  const headers = getRequestHeaders();
  return headers.get("cf-connecting-ip") ?? "unknown";
}
