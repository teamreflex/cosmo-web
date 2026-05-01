import { getRequest } from "@tanstack/react-start/server";

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
