import { drizzle } from "drizzle-orm/pg-proxy";
import * as schema from "./schema";
import { env } from "@/env.mjs";

export const indexer = drizzle(
  async (sql, params, method) => {
    try {
      const rows = await fetch(env.INDEXER_PROXY_URL, {
        method: "POST",
        headers: {
          "proxy-key": env.INDEXER_PROXY_KEY,
        },
        body: JSON.stringify({
          sql,
          params,
          method,
        }),
        cache: "no-cache",
      }).then((res) => res.json());

      return { rows };
    } catch (e: any) {
      console.error("Error from Drizzle HTTP proxy: ", e);
      return { rows: [] };
    }
  },
  { schema }
);
