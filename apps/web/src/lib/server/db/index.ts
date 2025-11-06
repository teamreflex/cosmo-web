import { drizzle } from "drizzle-orm/node-postgres";
import { relations } from "@apollo/database/web/relations";
import { env } from "@/lib/env/server";

// create the connection
export const db = drizzle(env.DATABASE_URL, { relations });
