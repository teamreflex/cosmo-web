import { env } from "@/lib/env/client";

/**
 * Get CORS headers based on the request origin
 */
export function getCorsHeaders(req: Request): Headers {
  const headers = new Headers([
    ["Access-Control-Allow-Methods", "GET, OPTIONS"],
    ["Access-Control-Allow-Headers", "Content-Type, Authorization"],
    ["Access-Control-Max-Age", "86400"],
    ["Vary", "Origin"],
  ]);

  const origin = req.headers.get("Origin");
  if (origin === env.VITE_VERCEL_PROJECT_PRODUCTION_URL) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}
