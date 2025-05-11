import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "@/env";
import { relations } from "./relations";

// create the connection (transaction support)
export const dbi = drizzle(env.DATABASE_URL, { relations });
