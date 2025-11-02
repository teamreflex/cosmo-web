import type { Collection } from "../server/db/indexer/schema";

type OwnedCollection = {
  collectionId: string;
  transferable: boolean;
  season: string;
  member: string;
  collectionNo: string;
};

type GridResult = {
  collectionId: string;
  owned: boolean;
};

type CollectionLookupMap = Map<string, string>;

/**
 * Determines which collections are owned by a user, and which are missing.
 */
export function calculateGrids(
  ownedCollections: OwnedCollection[],
  lookup: CollectionLookupMap,
): GridResult[] {
  // bucket transferable objekts by season/member and edition
  const groups = new Map<
    string,
    {
      season: string;
      member: string;
      editions: Map<number, Map<string, number>>;
    }
  >();

  for (const owned of ownedCollections) {
    if (!owned.transferable) continue;

    const edition = getEdition(owned.collectionNo);
    if (edition === null) continue;

    // reuse the group container for this season/member pair when possible
    const baseKey = `${owned.season}-${owned.member}`;
    let group = groups.get(baseKey);
    if (!group) {
      group = {
        season: owned.season,
        member: owned.member,
        editions: new Map(),
      };
      groups.set(baseKey, group);
    }

    // accumulate counts per edition so duplicate copies are tracked
    let collectionCounts = group.editions.get(edition);
    if (!collectionCounts) {
      collectionCounts = new Map();
      group.editions.set(edition, collectionCounts);
    }

    const collectionNo = owned.collectionNo.slice(0, -1); // strip physical suffix
    collectionCounts.set(
      collectionNo,
      (collectionCounts.get(collectionNo) || 0) + 1,
    );
  }

  const results: GridResult[] = [];

  for (const group of groups.values()) {
    const { season, member, editions } = group;

    for (const [edition, counts] of editions.entries()) {
      // determine how many grid instances can exist given the duplicates
      let maxCount = 0;
      for (const count of counts.values()) {
        if (count > maxCount) maxCount = count;
      }

      if (maxCount === 0) continue;

      const requiredCollections = getEditionCollections(edition);
      if (requiredCollections.length === 0) continue;

      for (let gridInstance = 1; gridInstance <= maxCount; gridInstance++) {
        for (const collectionNo of requiredCollections) {
          // compare the available copies to this grid instance index
          const count = counts.get(collectionNo) || 0;
          const owned = count >= gridInstance;
          const key = makeCollectionKey(season, member, collectionNo);
          const collectionId = lookup.get(key);
          if (collectionId) results.push({ collectionId, owned });
        }
      }
    }
  }

  return results;
}

/**
 * Get the edition of a collection based on the collection number.
 */
function getEdition(collectionNo: string): number | null {
  const num = parseInt(collectionNo, 10);
  if (num >= 101 && num <= 108) return 1;
  if (num >= 109 && num <= 116) return 2;
  if (num >= 117 && num <= 120) return 3;
  return null;
}

/**
 * Get the collection numbers for a given edition.
 */
const EDITION_COLLECTIONS: Record<number, readonly string[]> = {
  1: ["101", "102", "103", "104", "105", "106", "107", "108"],
  2: ["109", "110", "111", "112", "113", "114", "115", "116"],
  3: ["117", "118", "119", "120"],
};

function getEditionCollections(edition: number): readonly string[] {
  return EDITION_COLLECTIONS[edition] ?? [];
}

/**
 * Makes a key for a collection by season/member/collection number.
 */
function makeCollectionKey(
  season: string,
  member: string,
  collectionNo: string,
): string {
  return `${season}-${member}-${collectionNo}`;
}

/**
 * Builds a lookup map for collections by season/member/base collection number.
 */
export function buildCollectionLookupMap(
  collections: Collection[],
): CollectionLookupMap {
  const lookup: CollectionLookupMap = new Map();
  for (const c of collections) {
    if (!c.collectionNo) continue;
    const base = c.collectionNo.slice(0, -1);
    const key = makeCollectionKey(c.season, c.member, base);
    if (!lookup.has(key)) lookup.set(key, c.collectionId);
  }
  return lookup;
}
