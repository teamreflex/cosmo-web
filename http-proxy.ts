import { serve } from "bun";
import { Client } from "pg";

const client = new Client({
  host: process.env.PROXY_HOST,
  user: process.env.PROXY_USER,
  database: process.env.PROXY_NAME,
  password: process.env.PROXY_PASS,
  port: Number(process.env.PROXY_PORT),
});
await client.connect();

const port = Number(process.env.PROXY_HTTP_PORT);
console.log(`Proxy listening on port ${port}`);

serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    switch (path) {
      case "/query":
        return query(req);
      case "/status":
        return status();
      default:
        return new Response("Not found", { status: 404 });
    }
  },
});

/**
 * Executes SQL query on indexer database
 */
async function query(req: Request) {
  const { sql, params, method } = await req.json();
  const sqlBody = sql.replace(/;/g, "");

  try {
    if (method === "all") {
      const result = await client.query({
        text: sqlBody,
        values: params,
        rowMode: "array",
      });
      return Response.json(result.rows);
    }

    if (method === "execute") {
      const result = await client.query({
        text: sqlBody,
        values: params,
      });
      return Response.json(result.rows);
    }

    return Response.json({ error: "Unknown method value" }, { status: 500 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "error" }, { status: 500 });
  }
}

/**
 * Returns status of indexer processor
 */
async function status() {
  const result = await client.query("select * from squid_processor.status");

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return Response.json(
      { height: row.height },
      {
        status: 200,
        headers: {
          "Cache-Control": `public, max-age=${process.env.PROXY_CACHE_MAX_AGE}, stale-while-revalidate=30`,
        },
      }
    );
  }

  return Response.json({ height: 0 }, { status: 200 });
}
