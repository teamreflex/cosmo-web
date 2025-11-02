import { Context } from "hono";
import { env } from "../env";
import { writePool } from "../db";

export async function processorStatus(c: Context) {
  const client = await writePool.connect();

  try {
    const result = await client.query<Status>(
      "select * from squid_processor.status"
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return c.json({ height: row.height }, 200, {
        "Cache-Control": `public, max-age=${env.PROXY_CACHE_MAX_AGE}, stale-while-revalidate=30`,
      });
    }

    return c.json({ height: 0 });
  } catch (e) {
    console.error("Database status query error:", e);
    return c.json({ error: "Failed to get processor status" }, 500);
  } finally {
    client.release(); // always release the connection back to the pool
  }
}

type Status = {
  id: number;
  height: number;
  hash: string;
  nonce: number;
};
