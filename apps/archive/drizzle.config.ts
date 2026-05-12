import { defineConfig } from "drizzle-kit";

const url = Bun.env.DB_URL;
if (!url) throw new Error("DB_URL must be set to run drizzle-kit");

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
});
