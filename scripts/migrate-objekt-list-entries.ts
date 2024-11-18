import { drizzle as psDrizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import * as psSchema from "./planetscale-migrate/schema";
import postgres from "postgres";
import { drizzle as pgDrizzle } from "drizzle-orm/postgres-js";
import * as pgSchema from "../src/lib/server/db/indexer/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Migrate the list entries from using UUIDs for collectionIds, to using slugs.
 * This was necessary so any rehyradation of the indexer doesn't break objekt lists.
 */

const planetscale = psDrizzle(
  connect({
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  }),
  { schema: psSchema }
);

const oldUrl = `postgres://${process.env.INDEXER_DB_USERNAME}:${process.env.INDEXER_DB_PASSWORD}@${process.env.INDEXER_DB_HOST}:${process.env.INDEXER_DB_PORT}/${process.env.INDEXER_DB_NAME}`;
const oldIndexer = pgDrizzle(postgres(oldUrl), { schema: pgSchema });

const objektListEntries = await planetscale.query.listEntries.findMany();
const collectionIds = objektListEntries.map((entry) => entry.collectionId);
const collections = await oldIndexer.query.collections.findMany({
  where: inArray(pgSchema.collections.id, collectionIds),
});

for (const entry of objektListEntries) {
  const collection = collections.find((c) => c.id === entry.collectionId);
  const slug = collection!.collectionId.replace(/ /g, "-").toLowerCase();

  await planetscale
    .update(psSchema.listEntries)
    .set({
      ...entry,
      collectionId: slug,
    })
    .where(eq(psSchema.listEntries.id, entry.id));
}

console.log("migrated");
