import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/indexer/relations";
import { env } from "@/lib/env/server";

// set application name for pg_stat_activity visibility
const url = new URL(env.INDEXER_DATABASE_URL);
url.searchParams.set("application_name", "apollo.cafe");

const sql = new SQL({
  url: url.toString(),
  max: 20, // handle concurrent traffic with headroom
  idleTimeout: 30, // close idle connections quickly
  maxLifetime: 3600, // recycle connections every hour to prevent memory accumulation
  connectionTimeout: 10, // fail fast if DB is overloaded
});

export const indexer = drizzle(sql, { relations });
