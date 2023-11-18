import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";
import { env } from "@/env.mjs";

const client = new Client({
  host: env.INDEXER_DB_HOST,
  user: env.INDEXER_DB_USERNAME,
  password: env.INDEXER_DB_PASSWORD,
  port: env.INDEXER_DB_PORT,
  database: env.INDEXER_DB_NAME,
});

await client.connect();
export const indexer = drizzle(client, { schema });
