import { indexer } from "@/lib/server/db/indexer";
import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";
import {
  collections,
  collectionStats,
  members,
  objekts,
} from "@/lib/server/db/indexer/schema";
import {
  isRankedSort,
  mintCount,
  type RankedSort,
  withArtist,
  withClass,
  withCollectionSort,
  withCollections,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
  withSpinMonth,
  withTransferable,
} from "@/lib/server/objekts/filters.server";
import { userCollectionBackendSchema } from "@/lib/universal/parsers";
import { collectionSorts, supportedSort } from "@/lib/universal/sorts";
import { isMemberSort, isMintSort } from "@apollo/cosmo/types/common";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gt, lt, lte, sql } from "drizzle-orm";
import * as z from "zod";
import { mapLegacyObjekt } from "./common";

/**
 * this is a complete shitshow because the @cosmo-spin account doesn't get emptied,
 * it just keeps growing (4.2m rows at the time of writing)
 *
 * we now always query through the objekts table and keep the count query disabled for spin.
 * for spin, we only look at the last month of received objekts.
 */

const PER_PAGE = 60;

const schema = userCollectionBackendSchema.extend({
  address: z.string().min(1),
});
type InputData = z.infer<typeof schema>;

/**
 * Fetch a user's objekts from the indexer with given filters.
 */
export const $fetchObjektsBlockchain = createServerFn({ method: "GET" })
  .validator(schema)
  .handler(async ({ data }) => {
    const isSpin = isEqual(data.address, Addresses.SPIN);
    const owner = data.address.toLowerCase();

    // fetch both objekts and total count in parallel.
    // the client only reads `total` from page 0, so skip the count elsewhere.
    const [total, results] = await Promise.all([
      isSpin || data.page > 0 ? 0 : fetchCount(owner, data),
      fetchObjekts(data, owner, isSpin),
    ]);

    const hasNext = results.length === PER_PAGE;
    const nextStartAfter = hasNext ? data.page + 1 : undefined;

    return {
      total,
      hasNext,
      nextStartAfter,
      objekts: results.map((row) =>
        mapLegacyObjekt(row.objekts, row.collections),
      ),
    };
  });

type QueryResult = {
  objekts: Objekt;
  collections: Collection;
};

/**
 * Fetch the objekts from the database.
 * The inner subquery resolves the page of objekt IDs against the covering
 * owner indexes — sort keys, transferable and collection_id all live in the
 * index, so offset-skipped and filter-rejected rows never touch the heap.
 * The outer query then joins the full rows for just one page of IDs.
 */
async function fetchObjekts(
  data: InputData,
  owner: string,
  isSpin: boolean,
): Promise<QueryResult[]> {
  /**
   * Serial sorts on the spin account cause catastrophic query plans (the
   * planner walks the serial index and filters millions of rows by
   * received_at), and duplicate and mint sorts would rank every collection it
   * holds. Only collection sorts apply; anything else falls back to newest.
   */
  const sort = isSpin
    ? supportedSort(data.sort, collectionSorts)
    : (data.sort ?? "newest");
  if (isRankedSort(sort)) {
    return await fetchRankedObjekts(data, owner, sort);
  }

  let idsQuery = indexer
    .select({ id: objekts.id })
    .from(objekts)
    .leftJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, owner),
        ...collectionFilters(data),
        ...withTransferable(data.transferable),
        ...withSpinMonth(isSpin, objekts.receivedAt),
      ),
    )
    .$dynamic();
  if (isMemberSort(sort)) {
    idsQuery = idsQuery.leftJoin(members, eq(members.name, collections.member));
  }
  idsQuery = withCollectionSort(idsQuery, sort);
  const page = idsQuery
    .limit(PER_PAGE)
    .offset(data.page * PER_PAGE)
    .as("page");

  let query = indexer
    .select({ objekts, collections })
    .from(page)
    .innerJoin(objekts, eq(objekts.id, page.id))
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .$dynamic();
  if (isMemberSort(sort)) {
    query = query.leftJoin(members, eq(members.name, collections.member));
  }
  query = withCollectionSort(query, sort);

  return await query.comment({ fn: "fetchObjektsBlockchain" });
}

/**
 * Fetch a page of objekts for sorts that order collections by a count. The
 * owner's collections are ranked first, each with the position its first copy
 * lands at, and only the collections overlapping the page have their copies
 * fetched, so a large account never sorts every objekt it owns.
 */
async function fetchRankedObjekts(
  data: InputData,
  owner: string,
  sort: RankedSort,
): Promise<QueryResult[]> {
  const conditions = collectionFilters(data);
  const start = data.page * PER_PAGE;
  const end = start + PER_PAGE;

  let ownedQuery = indexer
    .select({
      collectionId: objekts.collectionId,
      copies: sql<number>`count(*)::int`.as("copies"),
    })
    .from(objekts)
    .$dynamic();
  if (conditions.length > 0) {
    ownedQuery = ownedQuery.innerJoin(
      collections,
      eq(collections.id, objekts.collectionId),
    );
  }
  const owned = indexer
    .$with("owned")
    .as(
      ownedQuery
        .where(
          and(
            eq(objekts.owner, owner),
            ...conditions,
            ...withTransferable(data.transferable),
          ),
        )
        .groupBy(objekts.collectionId),
    );

  // grouping before the stats join keeps it to one lookup per collection
  const rankKey = {
    duplicatesDesc: sql`${owned.copies} desc`,
    mintsAsc: sql`${mintCount} asc`,
    mintsDesc: sql`${mintCount} desc`,
  }[sort];
  let rankedQuery = indexer
    .select({
      collectionId: owned.collectionId,
      copies: owned.copies,
      offset:
        sql<number>`(sum(${owned.copies}) over (order by ${rankKey}, ${owned.collectionId} rows unbounded preceding) - ${owned.copies})::int`.as(
          "offset",
        ),
    })
    .from(owned)
    .$dynamic();
  if (isMintSort(sort)) {
    rankedQuery = rankedQuery.innerJoin(
      collectionStats,
      eq(collectionStats.collectionId, owned.collectionId),
    );
  }
  const ranked = indexer.$with("ranked").as(rankedQuery);

  // lateral so each overlapping collection probes the owner index on its own
  const copies = indexer
    .select({
      id: objekts.id,
      position:
        sql<number>`(${ranked.offset} + row_number() over (order by ${objekts.serial}, ${objekts.id}))::int`.as(
          "position",
        ),
    })
    .from(objekts)
    .where(
      and(
        eq(objekts.owner, owner),
        eq(objekts.collectionId, ranked.collectionId),
        ...withTransferable(data.transferable),
      ),
    )
    .as("copies");

  return await indexer
    .with(owned, ranked)
    .select({ objekts, collections })
    .from(ranked)
    .crossJoinLateral(copies)
    .innerJoin(objekts, eq(objekts.id, copies.id))
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        lt(ranked.offset, end),
        gt(sql`${ranked.offset} + ${ranked.copies}`, start),
        gt(copies.position, start),
        lte(copies.position, end),
      ),
    )
    .orderBy(copies.position)
    .comment({ fn: "fetchObjektsBlockchainRanked" });
}

/**
 * Fetch the count of objekts from the database.
 */
async function fetchCount(owner: string, filters: InputData): Promise<number> {
  const collectionConditions = collectionFilters(filters);

  let query = indexer
    .select({ count: sql<number>`count(*)` })
    .from(objekts)
    .$dynamic();

  // the FK guarantees every objekt has a collection, so only join when a
  // collection-column filter needs it — otherwise count objekts directly
  if (collectionConditions.length > 0) {
    query = query.innerJoin(
      collections,
      eq(collections.id, objekts.collectionId),
    );
  }

  const [results] = await query
    .where(
      and(
        eq(objekts.owner, owner),
        ...collectionConditions,
        ...withTransferable(filters.transferable),
      ),
    )
    .comment({ fn: "fetchObjektsCount" });

  return Number(results?.count ?? 0);
}

/**
 * Build collection filter conditions from input data.
 */
function collectionFilters(data: InputData) {
  return [
    ...withArtist(data.artist),
    ...withClass(data.class ?? []),
    ...withSeason(data.season ?? []),
    ...withOnlineType(data.on_offline ?? []),
    ...withMember(data.member),
    ...withCollections(data.collectionNo),
    ...withSelectedArtists(data.artists),
  ];
}
