import { drizzle } from "drizzle-orm/pg-proxy";
import * as schema from "./schema";
import { env } from "@/env.mjs";
import { ofetch } from "ofetch";

export const indexer = drizzle(
  async (sql, params, method) => {
    try {
      const rows = await ofetch(`${env.INDEXER_PROXY_URL}/query`, {
        retry: 1,
        retryDelay: 500, // retry after 500ms
        method: "POST",
        headers: {
          "proxy-key": env.INDEXER_PROXY_KEY,
        },
        body: JSON.stringify({
          sql,
          params,
          method,
        }),
      });

      return { rows };
    } catch (e: any) {
      console.error("Error from Drizzle HTTP proxy: ", e);
      return { rows: [] };
    }
  },
  { schema }
);
