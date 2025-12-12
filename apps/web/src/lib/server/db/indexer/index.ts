import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/indexer/relations";
import { env } from "@/lib/env/server";

// set application name for pg_stat_activity visibility
const url = new URL(env.INDEXER_DATABASE_URL);
url.searchParams.set("application_name", "apollo.cafe");

const client = new SQL({
  url: url.toString(),
  max: 25, // handle concurrent traffic with headroom
});

export const indexer = drizzle({ client, relations });
