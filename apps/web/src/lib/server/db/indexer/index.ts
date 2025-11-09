import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "@apollo/database/indexer/relations";
import { env } from "@/lib/env/server";

export const indexer = drizzle(env.INDEXER_DATABASE_URL, { relations });
