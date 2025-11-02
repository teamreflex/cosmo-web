import type { Context } from "hono";
import { readPool } from "../db";

export async function processQuery(c: Context) {
  const { sql, params, method } = await c.req.json();

  // validate input
  if (!sql || !method) {
    return c.json({ error: "Missing required fields: sql, method" }, 422);
  }

  // prevent multiple queries
  if (
    sql.includes(";") &&
    sql
      .trim()
      .split(";")
      .filter((s: string) => s.trim()).length > 1
  ) {
    return c.json({ error: "Multiple queries not allowed" }, 422);
  }

  const client = await readPool.connect();

  try {
    if (method === "all") {
      const result = await client.query({
        text: sql,
        values: params,
        rowMode: "array",
      });
      return c.json(result.rows);
    }

    if (method === "execute") {
      const result = await client.query({
        text: sql,
        values: params,
      });
      return c.json(result.rows);
    }

    return c.json({ error: "Unknown method value" }, 422);
  } catch (e) {
    console.error("Database query error:", e);
    return c.json({ error: "Database query failed" }, 500);
  } finally {
    client.release(); // always release the connection back to the pool
  }
}
