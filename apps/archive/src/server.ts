import { env } from "./env";
import type { Proxy } from "./proxy";

export function buildServer(proxy: Proxy) {
  return Bun.serve({
    port: env.PORT,
    idleTimeout: 240,
    routes: {
      "/health": () =>
        new Response("ok", { headers: { "content-type": "text/plain" } }),
      "/height": (req) => proxy.handleHeight(req),
      "/:fromBlock/worker": (req) =>
        proxy.handleWorkerLookup(req, req.params.fromBlock),
      "/_worker/:token": (req) =>
        proxy.handleWorkerQuery(req, req.params.token),
    },
    error(err) {
      console.error("[archive] server error:", err);
      return new Response("server error", {
        status: 500,
        headers: { "content-type": "text/plain" },
      });
    },
  });
}
