import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({
  path: ".env.local",
});

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
});
