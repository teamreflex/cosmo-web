import type {
  CollectionObjekts,
  ObjektSerial,
  SerialUpdate,
} from "../src/types";

/**
 * A collection exported from the indexer by `scripts/export-fixture.ts`.
 */
export type FixtureFile = {
  slug: string;
  exportedAt: string;
  collection: CollectionObjekts;
};

export async function loadFixture(slug: string): Promise<FixtureFile> {
  const file: FixtureFile = await Bun.file(
    `${import.meta.dir}/fixtures/${slug}.json`,
  ).json();
  return file;
}

/**
 * A fixture with some serials hidden, and the real serials they had.
 */
export type HiddenSerials = {
  collection: CollectionObjekts;
  truth: Map<number, number>;
};

/**
 * The fixture with some known serials hidden, as if their objekts had been
 * minted after `cutoff`: their serial becomes 0 and their mint time moves
 * past the cutoff. Returns the hidden objekts' real serials for comparison.
 */
export function hideSerials(
  collection: CollectionObjekts,
  cutoff: number,
  hidden: (objekt: ObjektSerial) => boolean,
): HiddenSerials {
  const truth = new Map<number, number>();
  const objekts = collection.objekts.map((objekt) => {
    if (!hidden(objekt)) {
      return objekt;
    }
    truth.set(objekt.tokenId, objekt.serial);
    return { ...objekt, serial: 0, mintedAt: cutoff + 1 };
  });
  return {
    collection:
      collection.kind === "sequential"
        ? { kind: "sequential", objekts }
        : { kind: "reserved", objekts, reservations: collection.reservations },
    truth,
  };
}

/**
 * Estimated serials keyed by token id.
 */
export function serialsOf(
  updates: readonly SerialUpdate[],
): Map<number, number> {
  return new Map(updates.map((update) => [update.tokenId, update.serial]));
}
