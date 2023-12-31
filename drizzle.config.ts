import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({
  path: ".env.local",
});

const uri = `mysql://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}/${process.env.DATABASE_NAME}?ssl={"rejectUnauthorized":true}`;

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  driver: "mysql2",
  dbCredentials: {
    uri,
  },
});
