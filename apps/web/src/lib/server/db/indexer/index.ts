import { drizzle } from "drizzle-orm/pg-proxy";
import { ofetch } from "ofetch";
import { relations } from "./relations";
import { env } from "@/lib/env/server";

export const indexer = drizzle(
  async (sql, params, method) => {
    try {
      const rows = await ofetch(`${env.INDEXER_PROXY_URL}/query`, {
        retry: false,
        timeout: 10000,
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
    } catch (err) {
      console.error("Error from Drizzle HTTP proxy: ", err);
      return { rows: [] };
    }
  },
  { relations },
);
