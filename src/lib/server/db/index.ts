import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import { env } from "@/env.mjs";
import * as schema from "./schema";

// create the connection
const connection = connect({
  host: env.DATABASE_HOST,
  username: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
});

export const db = drizzle(connection, {
  schema,
  // logger: true,
});
