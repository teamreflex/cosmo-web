import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED is required");
}

export default defineConfig({
  schema: "../../packages/database/src/web/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
