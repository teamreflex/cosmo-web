import { indexer } from "@/lib/server/db/indexer";
import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { userCollectionBackendSchema } from "@/lib/universal/parsers";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, sql } from "drizzle-orm";
import * as z from "zod";
import {
  withArtist,
  withClass,
  withCollectionSort,
  withCollections,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
  withTransferable,
} from "../filters";
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
  .inputValidator(schema)
  .handler(async ({ data }) => {
    const isSpin = isEqual(data.address, Addresses.SPIN);
    const owner = data.address.toLowerCase();

    // fetch both objekts and total count in parallel
    const [total, results] = await Promise.all([
      isSpin ? Promise.resolve(0) : fetchCount(owner, data),
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
 */
async function fetchObjekts(
  data: InputData,
  owner: string,
  isSpin: boolean,
): Promise<QueryResult[]> {
  let query = indexer
    .select({ objekts, collections })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, owner),
        ...collectionFilters(data),
        ...withTransferable(data.transferable),
        ...spinMonthFilter(isSpin),
      ),
    )
    .$dynamic();

  query = withCollectionSort(query, data.sort ?? "newest");
  query = query.limit(PER_PAGE).offset(data.page * PER_PAGE);

  return await query;
}

/**
 * Fetch the count of objekts from the database.
 */
async function fetchCount(owner: string, filters: InputData): Promise<number> {
  let query = indexer
    .select({ count: sql<number>`count(*)` })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, owner),
        ...collectionFilters(filters),
        ...withTransferable(filters.transferable),
      ),
    );

  const [results] = await query;

  return Number(results?.count ?? 0);
}

/**
 * Build the filter for the spin account to only query the last month of objekts.
 */
function spinMonthFilter(isSpin: boolean) {
  if (!isSpin) return [];
  return [gte(objekts.receivedAt, sql`now() - interval '1 month'`)];
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
