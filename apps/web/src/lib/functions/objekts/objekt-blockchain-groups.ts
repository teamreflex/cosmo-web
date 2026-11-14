import { indexer } from "@/lib/server/db/indexer";
import {
  mintOrder,
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
  withTransferable,
} from "@/lib/server/objekts/filters.server";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { userCollectionBackendSchema } from "@/lib/universal/parsers";
import {
  isMemberSort,
  isMintSort,
  type MintSort,
  type ValidSort,
} from "@apollo/cosmo/types/common";
import {
  collections,
  collectionStats,
  members,
  objekts,
} from "@apollo/database/indexer/schema";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, inArray, max, sql } from "drizzle-orm";
import type { PgSelect } from "drizzle-orm/pg-core";
import * as z from "zod";

export const PER_PAGE = 30;

const inputSchema = userCollectionBackendSchema.extend({
  address: z.string().min(1),
});

/**
 * Fetches one page of collection ids in sort order. Joins the collections
 * table only when a filter or sort needs it, so the fast path stays on the
 * objekts table.
 */
async function fetchCollectionPage(
  data: z.infer<typeof inputSchema>,
  address: string,
  sort: ValidSort,
  offset: number,
) {
  const objektFilters = [
    eq(objekts.owner, address),
    ...withTransferable(data.transferable),
  ];
  const collectionFilters = [
    ...withArtist(data.artist),
    ...withClass(data.class ?? []),
    ...withSeason(data.season ?? []),
    ...withOnlineType(data.on_offline ?? []),
    ...withMember(data.member),
    ...withSelectedArtists(data.artists),
  ];
  const requiresCollectionJoin =
    collectionFilters.length > 0 ||
    sort === "noAscending" ||
    sort === "noDescending" ||
    isMemberSort(sort);

  let idsQuery = requiresCollectionJoin
    ? indexer
        .select({
          collectionId: collections.id,
          collectionNo: collections.collectionNo,
          totalCount: sql<number>`count(*) over ()::int`
            .mapWith(Number)
            .as("total_count"),
        })
        .from(objekts)
        .innerJoin(collections, eq(objekts.collectionId, collections.id))
        .where(and(...objektFilters, ...collectionFilters))
        .groupBy(collections.id, collections.collectionNo)
        .$dynamic()
    : indexer
        .select({
          collectionId: objekts.collectionId,
          totalCount: sql<number>`count(*) over ()::int`
            .mapWith(Number)
            .as("total_count"),
        })
        .from(objekts)
        .where(and(...objektFilters))
        .groupBy(objekts.collectionId)
        .$dynamic();

  // group before joining collection_stats, so the join is one lookup per
  // collection rather than per objekt
  if (isMintSort(sort)) {
    const groups = idsQuery.as("groups");
    return await indexer
      .select({
        collectionId: groups.collectionId,
        totalCount: groups.totalCount,
      })
      .from(groups)
      .innerJoin(
        collectionStats,
        eq(collectionStats.collectionId, groups.collectionId),
      )
      .orderBy(mintOrder(sort), asc(groups.collectionId))
      .limit(PER_PAGE)
      .offset(offset)
      .comment({ fn: "fetchBlockchainGroupsByMints" });
  }

  // member sort orders by the joined member table; requiresCollectionJoin is
  // always set for member sorts, so collections is guaranteed to be joined.
  if (isMemberSort(sort)) {
    idsQuery = idsQuery.leftJoin(members, eq(members.name, collections.member));
  }

  idsQuery = withObjektGroupSort(
    idsQuery,
    sort,
    requiresCollectionJoin ? collections.id : objekts.collectionId,
  );

  return await idsQuery
    .limit(PER_PAGE)
    .offset(offset)
    .comment({ fn: "fetchBlockchainGroups" });
}

/**
 * Fetch a user's collection groups from the indexer with given filters.
 */
export const $fetchObjektsBlockchainGroups = createServerFn({ method: "GET" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    // query is too slow for the spin account
    if (isEqual(data.address, Addresses.SPIN)) {
      return { collectionCount: 0, collections: [] };
    }

    const offset = data.page * PER_PAGE;
    const sort = data.sort ?? "newest";
    const address = data.address.toLowerCase();

    const idsResult = await fetchCollectionPage(data, address, sort, offset);
    const totalCount = idsResult[0]?.totalCount ?? 0;

    if (idsResult.length === 0) {
      return { collectionCount: 0, collections: [] };
    }

    const collectionIds = idsResult.map((r) => r.collectionId);

    // 2a. fetch collections
    const collectionsResult = await indexer
      .select({
        id: collections.id,
        artist: collections.artist,
        member: collections.member,
        season: collections.season,
        class: collections.class,
        collectionNo: collections.collectionNo,
        collectionId: collections.collectionId,
        frontImage: collections.frontImage,
        backImage: collections.backImage,
        frontImageVersion: collections.frontImageVersion,
        backImageVersion: collections.backImageVersion,
        backgroundColor: collections.backgroundColor,
        textColor: collections.textColor,
        bandImageUrl: collections.bandImageUrl,
        frontMedia: collections.frontMedia,
        hasAudio: collections.hasAudio,
      })
      .from(collections)
      .where(inArray(collections.id, collectionIds))
      .comment({ fn: "fetchBlockchainGroupCollections" });

    // 2b. fetch objekts
    const objektsResult = await indexer
      .select({
        collectionId: objekts.collectionId,
        id: objekts.id,
        serial: objekts.serial,
        transferable: objekts.transferable,
        receivedAt: objekts.receivedAt,
      })
      .from(objekts)
      .where(
        and(
          eq(objekts.owner, address),
          inArray(objekts.collectionId, collectionIds),
          ...withTransferable(data.transferable),
        ),
      )
      .comment({ fn: "fetchBlockchainGroupObjekts" });

    // 3. build the response in JS
    const collectionsMap = new Map(collectionsResult.map((c) => [c.id, c]));

    // 4. group objekts by collection
    const objektsByCollection = new Map<string, typeof objektsResult>();
    for (const obj of objektsResult) {
      const list = objektsByCollection.get(obj.collectionId) ?? [];
      list.push(obj);
      objektsByCollection.set(obj.collectionId, list);
    }

    // 5. build result in original sort order
    const resultCollections: Objekt.Group[] = [];
    for (const colId of collectionIds) {
      const col = collectionsMap.get(colId);
      if (!col) continue;

      resultCollections.push({
        collection: Objekt.fromIndexer(col),
        objekts: (objektsByCollection.get(colId) ?? []).map((obj) =>
          Objekt.tokenFromRow(obj, col.class),
        ),
      });
    }

    return {
      collectionCount: totalCount,
      collections: resultCollections,
    };
  });

/**
 * Custom sorting filters as collection groups have a different mechanism for sorting.
 */
function withObjektGroupSort<T extends PgSelect>(
  qb: T,
  sort: Exclude<ValidSort, MintSort>,
  tieBreaker: typeof collections.id | typeof objekts.collectionId,
) {
  switch (sort) {
    case "newest":
      return qb.orderBy(desc(max(objekts.receivedAt)), asc(tieBreaker));
    case "oldest":
      return qb.orderBy(asc(max(objekts.receivedAt)), asc(tieBreaker));
    case "noAscending":
      return qb.orderBy(asc(collections.collectionNo), asc(tieBreaker));
    case "noDescending":
      return qb.orderBy(desc(collections.collectionNo), asc(tieBreaker));
    case "serialAsc":
      return qb.orderBy(asc(max(objekts.serial)), asc(tieBreaker));
    case "serialDesc":
      return qb.orderBy(desc(max(objekts.serial)), asc(tieBreaker));
    // grouped by collection.id, so the joined member order must be aggregated;
    // each collection has one member, making min() exact.
    case "memberAsc":
      return qb.orderBy(
        sql`min(${members.sortOrder}) asc nulls last`,
        asc(tieBreaker),
      );
    case "memberDesc":
      return qb.orderBy(
        sql`min(${members.sortOrder}) desc nulls last`,
        asc(tieBreaker),
      );
    case "duplicatesDesc":
      return qb.orderBy(desc(count()), asc(tieBreaker));
  }
}
