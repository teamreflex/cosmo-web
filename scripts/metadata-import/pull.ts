import { db } from "@/lib/server/db";
import * as neonSchema from "@/lib/server/db/schema";
import { writeFile } from "fs/promises";

/**
 * Pull the metadata that's currently in the database.
 */

const metadata = await db
  .select({
    slug: neonSchema.objektMetadata.collectionId,
    description: neonSchema.objektMetadata.description,
  })
  .from(neonSchema.objektMetadata);

const entries = metadata
  .map(({ slug, description }) => `${slug} :: ${description}`)
  .sort((a, b) => a.localeCompare(b));

await writeFile("./scripts/metadata-import/metadata.txt", entries.join("\n"), {
  encoding: "utf8",
});

console.log(`Wrote ${entries.length} entries to metadata.txt`);
