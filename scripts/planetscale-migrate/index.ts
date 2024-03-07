import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import * as planetscaleSchema from "./schema";
import { db } from "@/lib/server/db";
import * as neonSchema from "@/lib/server/db/schema";

// create the connection
const client = new Client({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
});

const planetscale = drizzle(client, { schema: planetscaleSchema });

async function chunk<T>(
  arr: T[],
  chunkSize: number,
  callback: (chunk: T[]) => Promise<void>
) {
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    await callback(chunk);
  }
}

console.log("Migrating profiles...");
const profiles = await planetscale.select().from(planetscaleSchema.profiles);
await chunk(profiles, 500, async (rows) => {
  await db.insert(neonSchema.profiles).values(rows);
});
console.log("Profiles migrated");

console.log("Migrating locked objekts...");
const lockedObjekts = await planetscale
  .select()
  .from(planetscaleSchema.lockedObjekts);
await chunk(lockedObjekts, 500, async (rows) => {
  await db.insert(neonSchema.lockedObjekts).values(rows);
});
console.log("Locked objekts migrated");

console.log("Migrating lists...");
const lists = await planetscale.select().from(planetscaleSchema.lists);
await chunk(lists, 500, async (rows) => {
  await db.insert(neonSchema.lists).values(rows);
});
console.log("Lists migrated");

console.log("Migrating list entries...");
const listEntries = await planetscale
  .select()
  .from(planetscaleSchema.listEntries);
await chunk(listEntries, 500, async (rows) => {
  await db.insert(neonSchema.listEntries).values(rows);
});
console.log("List entries migrated");

console.log("Migration complete");
