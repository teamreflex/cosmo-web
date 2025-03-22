import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "@/env";
import { relations } from "./relations";

/**
 * Websocket connection to the database.
 * Only to be used when needing transactions.
 */
export const dbi = drizzle(env.DATABASE_URL, { relations });
