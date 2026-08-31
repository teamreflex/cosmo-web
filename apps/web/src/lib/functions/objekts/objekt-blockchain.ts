import { indexer } from "@/lib/server/db/indexer";
import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";
import { collections, members, objekts } from "@/lib/server/db/indexer/schema";
import {
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
import { isMemberSort, type ValidSort } from "@apollo/cosmo/types/common";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, sql } from "drizzle-orm";
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
  const sort = isSpin ? clampSpinSort(data.sort) : (data.sort ?? "newest");

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
 * Serial sorts on the spin account cause catastrophic query plans — the
 * planner walks the serial index and filters millions of rows by received_at.
 * Fall back to newest which uses the received_at index instead.
 */
function clampSpinSort(sort: ValidSort | null | undefined): ValidSort {
  if (sort === "serialAsc" || sort === "serialDesc") return "newest";
  return sort ?? "newest";
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
