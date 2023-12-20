import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env.mjs";

type PostgresDB = ReturnType<typeof postgres> | undefined;

let postgresDb: PostgresDB = undefined;

const databaseUrl = `postgres://${env.INDEXER_DB_USERNAME}:${env.INDEXER_DB_PASSWORD}@${env.INDEXER_DB_HOST}:${env.INDEXER_DB_PORT}/${env.INDEXER_DB_NAME}`;

// prevents HMR from exhausing connections
if (process.env.NODE_ENV !== "production") {
  if (!postgresDb) {
    postgresDb = postgres(databaseUrl);
  }
} else {
  postgresDb = postgres(databaseUrl);
}

export const indexer = drizzle(postgresDb, { schema });
