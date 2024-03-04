import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { env } from "@/env.mjs";
import * as schema from "./schema";

// create the connection
const client = new Client({
  host: env.DATABASE_HOST,
  username: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
});

export const db = drizzle(client, {
  schema,
  // logger: true,
});
