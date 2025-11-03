import { Hono } from "hono";
import { env } from "./env";
import { processQuery } from "./handlers/process-query";
import { processorStatus } from "./handlers/processor-status";
import { rescanMetadata } from "./handlers/rescan-metadata";
import { setBand } from "./handlers/set-band";

const app = new Hono();

// middleware
app.use(async (c, next) => {
  const key = c.req.header("proxy-key");
  if (key !== env.PROXY_KEY) {
    return c.json({ error: "Invalid key" }, 401);
  }

  await next();
});

app.post("/query", processQuery);
app.get("/status", processorStatus);
app.post("/rescan-metadata/:tokenId", rescanMetadata);
app.post("/set-band", setBand);

console.log(`[drizzle-proxy] Listening on port ${env.PROXY_HTTP_PORT}`);

export default {
  port: env.PROXY_HTTP_PORT,
  fetch: app.fetch,
};
