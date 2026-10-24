import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import path from "node:path";

/**
 * migrates the database without having drizzle-kit in the image.
 */

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED is required");
}

const client = new SQL({ url, max: 1 });
try {
  await migrate(drizzle({ client }), {
    migrationsFolder: path.join(import.meta.dir, "drizzle"),
  });
  // oxlint-disable-next-line no-console -- need success log
  console.info("[SUCCESS] Migrations applied");
} catch (error) {
  console.error("[ERROR] Migrations failed to apply", error);
  process.exitCode = 1;
} finally {
  await client.close();
}
