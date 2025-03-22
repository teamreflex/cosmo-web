import { drizzle } from "drizzle-orm/pg-proxy";
import { env } from "@/env";
import { ofetch } from "ofetch";
import { relations } from "./relations";

export const indexer = drizzle(
  async (sql, params, method) => {
    try {
      const rows = await ofetch(`${env.INDEXER_PROXY_URL}/query`, {
        retry: false,
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
  { relations }
);
