import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/indexer/relations";
import { SQL } from "bun";
import { env } from "@/lib/env/server";
import { env as clientEnv } from "@/lib/env/client";

const sql = new SQL({
  url: env.INDEXER_DATABASE_URL,
  prepare: clientEnv.VITE_APP_ENV === "production",
});
export const indexer = drizzle(sql, { relations });
