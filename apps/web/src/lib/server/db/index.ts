import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/web/relations";
import { env } from "@/lib/env/server";

export const db = drizzle(env.DATABASE_URL, { relations });
