import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../packages/database/src/web/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
  casing: "snake_case",
});
