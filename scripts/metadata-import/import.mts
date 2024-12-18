import { db } from "../../src/lib/server/db";
import { objektMetadata } from "../../src/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";

/**
 * Import objekt metadata from a text file.
 */

const DELIMITER = " :: ";
const USER = "0x7e3ea1850696E9aA34EEaD1d7d64CD78679B2e43";

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
    .insert(objektMetadata)
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
      target: objektMetadata.collectionId,
      where: eq(objektMetadata.collectionId, collectionId),
    });
});

await chunk(queries, 250, async (entries) => {
  console.log(`Starting chunk of ${entries.length} entries`);
  await db.batch(entries as any);
});

console.log("Import complete");
