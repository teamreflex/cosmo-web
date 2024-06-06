import { indexer } from "@/lib/server/db/indexer";
import {
  objekts,
  collections,
  Objekt,
  Collection,
} from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withCollections,
  withGridable,
  withMember,
  withOnlineType,
  withSeason,
  withTransferable,
} from "@/lib/server/objekts/filters";
import { ValidArtist, ValidSort } from "@/lib/universal/cosmo/common";
import {
  NonTransferableReason,
  OwnedObjekt,
} from "@/lib/universal/cosmo/objekts";
import { parseUserCollection } from "@/lib/universal/parsers";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { PgSelect } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
const PER_PAGE = 30;

type Params = {
  params: {
    address: string;
  };
};

/**
 * API route that services the user collection page when using the blockchain as a data source.
 * Takes all Cosmo filters as query params.
 */
export async function GET(request: NextRequest, { params }: Params) {
  // parse query params
  const filters = parseUserCollection(request.nextUrl.searchParams);

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
        eq(objekts.owner, params.address.toLowerCase()),
        ...[
          ...withArtist(filters.artist),
          ...withClass(filters.class),
          ...withSeason(filters.season),
          ...withOnlineType(filters.on_offline),
          ...withMember(filters.member),
          ...withCollections(filters.collectionNo),
          ...withTransferable(filters.transferable),
          ...withGridable(filters.gridable),
        ]
      )
    )
    .$dynamic();
  query = withSort(query, filters.sort);
  query = query.limit(PER_PAGE).offset(filters.page * PER_PAGE);

  const result = await query;

  const hasNext = result.length === PER_PAGE;
  const nextStartAfter = hasNext ? filters.page + 1 : undefined;

  return Response.json({
    total: result[0]?.count ?? 0,
    hasNext,
    nextStartAfter,
    objekts: result
      .filter((r) => r.collections !== null) // should never happen but just in case
      .map((row) => mapResult(row.objekts, row.collections!)),
  });
}

/**
 * Custom withSort filter that handles the serial sort.
 */
function withSort<T extends PgSelect>(qb: T, sort: ValidSort) {
  switch (sort) {
    case "newest":
      return qb.orderBy(desc(objekts.receivedAt));
    case "oldest":
      return qb.orderBy(asc(objekts.receivedAt));
    case "noAscending":
      return qb.orderBy(asc(collections.collectionNo));
    case "noDescending":
      return qb.orderBy(desc(collections.collectionNo));
    case "serialAsc":
      return qb.orderBy(asc(objekts.serial));
    case "serialDesc":
      return qb.orderBy(desc(objekts.serial));
  }
}

/**
 * Map indexed objekt/collection into an entity compatible with existing type.
 */
function mapResult(objekt: Objekt, collection: Collection): OwnedObjekt {
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
    usedForGrid: objekt.used_for_grid,
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

  if (collection.class === "First" && objekt.transferable === false) {
    return objekt.used_for_grid ? "used-for-grid" : "challenge-reward";
  }
}
