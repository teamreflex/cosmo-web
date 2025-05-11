import { neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/env";
import { relations } from "./relations";

/**
 * Enables local proxy support.
 */
neonConfig.fetchEndpoint = (host) => {
  const protocol = host === "db.localtest.me" ? "http" : "https";
  const port = host === "db.localtest.me" ? 4444 : 443;
  return `${protocol}://${host}:${port}/sql`;
};

// create the connection
export const db = drizzle(env.DATABASE_URL, { relations, logger: true });
