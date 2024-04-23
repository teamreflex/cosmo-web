import { Client } from "pg";
import { Hono } from "hono";

const app = new Hono();

const client = new Client({
  host: process.env.PROXY_HOST,
  user: process.env.PROXY_USER,
  database: process.env.PROXY_NAME,
  password: process.env.PROXY_PASS,
  port: Number(process.env.PROXY_PORT),
});

// @ts-ignore - using bun
await client.connect();

app.post("/query", async (c) => {
  const key = c.req.header("proxy-key");
  if (key !== process.env.PROXY_KEY) {
    return c.json({ error: "Invalid key" }, 401);
  }

  const { sql, params, method } = await c.req.json();

  // prevent multiple queries
  const sqlBody = sql.replace(/;/g, "");

  try {
    if (method === "all") {
      const result = await client.query({
        text: sqlBody,
        values: params,
        rowMode: "array",
      });
      return c.json(result.rows);
    }

    if (method === "execute") {
      const result = await client.query({
        text: sqlBody,
        values: params,
      });
      return c.json(result.rows);
    }

    return c.json({ error: "Unknown method value" }, 500);
  } catch (e) {
    console.error(e);
    return c.json({ error: "error" }, 500);
  }
});

console.log(`Proxy listening on port ${process.env.PROXY_HTTP_PORT}`);

export default {
  port: process.env.PROXY_HTTP_PORT,
  fetch: app.fetch,
};
