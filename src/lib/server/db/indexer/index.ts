import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env.mjs";

const client = postgres({
  host: env.INDEXER_DB_HOST,
  username: env.INDEXER_DB_USERNAME,
  password: env.INDEXER_DB_PASSWORD,
  port: env.INDEXER_DB_PORT,
  database: env.INDEXER_DB_NAME,
});

export const indexer = drizzle(client, { schema });
