import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/web/relations";
import { SQL } from "bun";
import { env } from "@/lib/env/server";
import { env as clientEnv } from "@/lib/env/client";

const sql = new SQL({
  url: env.DATABASE_URL,
  prepare: clientEnv.VITE_APP_ENV === "production",
});
export const db = drizzle(sql, { relations });
