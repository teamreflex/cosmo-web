// oxlint-disable no-console -- CLI script reporting progress on stdout
import { SERIAL_CUTOFF } from "../src";
import type { FixtureFile } from "../tests/fixture";
import { client, findCollection, loadCollection } from "./database";

/**
 * Export a collection from the indexer database at INDEXER_DATABASE_URL as a
 * test fixture, with its reservations from serial_reservation.
 *
 *   bun scripts/export-fixture.ts <slug> [maxTokenId]
 *
 * `maxTokenId` trims a collection to the objekts up to that id, which is all
 * a digital estimate depends on. Serials minted after the cutoff are written
 * as 0: what the database holds for them is our own estimate, not COSMO's.
 */
const [slug, maxTokenId] = process.argv.slice(2);
if (slug === undefined) {
  throw new Error("usage: bun scripts/export-fixture.ts <slug> [maxTokenId]");
}

const loaded = await loadCollection(
  await findCollection(slug),
  maxTokenId === undefined ? undefined : Number(maxTokenId),
);
const collection = {
  ...loaded,
  objekts: loaded.objekts.map((objekt) =>
    objekt.mintedAt > SERIAL_CUTOFF ? { ...objekt, serial: 0 } : objekt,
  ),
};
const file: FixtureFile = {
  slug,
  exportedAt: new Date().toISOString(),
  collection,
};
await Bun.write(
  `${import.meta.dir}/../tests/fixtures/${slug}.json`,
  JSON.stringify(file),
);
console.log(
  `${slug}: ${collection.objekts.length} objekts${collection.kind === "reserved" ? `, ${collection.reservations.length} reservations` : ""}`,
);
await client.close();
