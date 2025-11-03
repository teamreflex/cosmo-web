import { Pool } from "pg";
import { env } from "./env";

// connection pool for read operations
export const readPool = new Pool({
  host: env.DB_HOST,
  user: env.DB_READ_USER,
  database: env.DB_NAME,
  password: env.DB_READ_PASS,
  port: env.DB_PORT,
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// separate pool for write operations (status endpoint)
export const writePool = new Pool({
  host: env.DB_HOST,
  user: env.DB_USER,
  database: env.DB_NAME,
  password: env.DB_PASS,
  port: env.DB_PORT,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down database pools...");
  await readPool.end();
  await writePool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down database pools...");
  await readPool.end();
  await writePool.end();
  process.exit(0);
});
