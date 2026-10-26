import { auth } from "@/lib/server/auth.server";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Keeps chat tokens out of the browser cache and Cloudflare's /api cache.
 */
async function handle(request: Request) {
  const response = await auth.handler(request);
  if (new URL(request.url).pathname === "/api/auth/token") {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
