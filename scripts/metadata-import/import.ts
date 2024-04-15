import { db } from "@/lib/server/db";
import * as neonSchema from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";

/**
 * Import objekt metadata from a text file.
 */

const DELIMITER = " :: ";
const USER = "";

// read file
const data = await readFile("./scripts/metadata-import/metadata.txt", {
  encoding: "utf8",
});
const entries = data
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [slug, description] = line.split(DELIMITER);
    return {
      collectionId: slug,
      description: description.trimEnd(),
      contributor: USER,
    };
  });

console.log(`Importing ${entries.length} entries`);

const queries = entries.map(({ collectionId, description }) => {
  return db
    .insert(neonSchema.objektMetadata)
    .values({
      collectionId,
      description,
      contributor: USER,
    })
    .onConflictDoUpdate({
      set: {
        description,
        contributor: USER,
      },
      target: neonSchema.objektMetadata.collectionId,
      where: eq(neonSchema.objektMetadata.collectionId, collectionId),
    });
});

const result = await db.batch(queries as any);

console.log("Import complete");
