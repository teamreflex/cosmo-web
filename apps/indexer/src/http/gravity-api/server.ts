import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { pollVotes } from "./handlers/poll-votes";

const app = new Hono();

app.use(
  cors({
    origin: env.GRAVITY_CORS || "*",
  })
);

app.get("/poll/:pollId", pollVotes);

console.log(`[gravity-api] Listening on port ${env.GRAVITY_HTTP_PORT}`);

export default {
  port: env.GRAVITY_HTTP_PORT,
  fetch: app.fetch,
};
