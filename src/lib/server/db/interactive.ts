import { drizzle } from "drizzle-orm/neon-serverless";
import { relations } from "./relations";
import { env } from "@/lib/env/server";

// create the connection (transaction support)
export const dbi = drizzle(env.DATABASE_URL, { relations });
