import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/web/relations";
import { env } from "@/lib/env/server";

// set application name for pg_stat_activity visibility
const url = new URL(env.DATABASE_URL);
url.searchParams.set("application_name", "apollo.cafe");

const client = new SQL({
  url: url.toString(),
  max: 15, // handle concurrent traffic with headroom
});

export const db = drizzle({ client, relations });
