import { userCollection } from "@/lib/universal/parsers";
import { z } from "zod";
import { indexer } from "../../db/indexer";
import { and, eq, sql } from "drizzle-orm";
import {
  Collection,
  collections,
  Objekt,
  objekts,
} from "../../db/indexer/schema";
import {
  withArtist,
  withClass,
  withCollections,
  withMember,
  withOnlineType,
  withSeason,
  withSort,
  withTransferable,
} from "../filters";
import {
  CosmoObjekt,
  NonTransferableReason,
} from "@/lib/universal/cosmo/objekts";
import { ValidArtist } from "@/lib/universal/cosmo/common";

export const PER_PAGE = 60;

/**
 * Ensures the Zod-parsed filters match what the frontend parses.
 * Used for hydrating the query client.
 */
export function parseUserCollectionFilters(
  filters: z.infer<typeof userCollection>
) {
  return {
    artist: filters.artist,
    class: filters.class.length > 0 ? filters.class : null,
    collection: null,
    collectionNo: filters.collectionNo.length > 0 ? filters.collectionNo : null,
    gridable: null,
    member: filters.member,
    on_offline: filters.on_offline.length > 0 ? filters.on_offline : null,
    season: filters.season.length > 0 ? filters.season : null,
    sort: filters.sort === "newest" ? null : filters.sort,
    transferable: null,
    used_for_grid: null,
  };
}

/**
 * Fetch a user's objekts from the indexer with given filters.
 */
export async function fetchObjektsPolygon(
  address: string,
  filters: z.infer<typeof userCollection>
) {
  let query = indexer
    .select({
      count: sql<number>`count(*) OVER() AS count`,
      objekts,
      collections,
    })
    .from(objekts)
    .leftJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, address.toLowerCase()),
        ...[
          ...withArtist(filters.artist),
          ...withClass(filters.class),
          ...withSeason(filters.season),
          ...withOnlineType(filters.on_offline),
          ...withMember(filters.member),
          ...withCollections(filters.collectionNo),
          ...withTransferable(filters.transferable),
        ]
      )
    )
    .$dynamic();
  query = withSort(query, filters.sort);
  query = query.limit(PER_PAGE).offset(filters.page * PER_PAGE);

  const results = await query;

  const hasNext = results.length === PER_PAGE;
  const nextStartAfter = hasNext ? filters.page + 1 : undefined;

  return {
    total: Number(results[0]?.count ?? 0),
    hasNext,
    nextStartAfter,
    objekts: results
      .filter((r) => r.collections !== null) // should never happen but just in case
      .map((row) => mapResult(row.objekts, row.collections!)),
  };
}

/**
 * Map indexed objekt/collection into an entity compatible with existing type.
 */
function mapResult(objekt: Objekt, collection: Collection): CosmoObjekt {
  return {
    ...collection,
    thumbnailImage: collection.frontImage,
    accentColor: collection.textColor,
    artists: [collection.artist as ValidArtist],
    tokenId: String(objekt.id),
    tokenAddress: collection.contract,
    objektNo: objekt.serial,
    mintedAt: objekt.mintedAt,
    receivedAt: objekt.receivedAt,
    status: "minted",
    transferable: objekt.transferable,
    usedForGrid: false,
    nonTransferableReason: nonTransferableReason(objekt, collection),
    // cannot currently be determined
    lenticularPairTokenId: null,
    // seemingly unused
    transferablebyDefault: true,
  };
}

/**
 * Derive the non transferable reason from the objekt/collection.
 */
function nonTransferableReason(
  objekt: Objekt,
  collection: Collection
): NonTransferableReason | undefined {
  if (collection.class === "Welcome") {
    return "welcome-objekt";
  }

  return objekt.transferable === false ? "not-transferable" : undefined;
}
