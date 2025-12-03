import { and, eq, sql } from "drizzle-orm";
import * as z from "zod";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { indexer } from "../../db/indexer";
import { collections, objekts } from "../../db/indexer/schema";
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
import { userCollectionBackendSchema } from "@/lib/universal/parsers";

const PER_PAGE = 60;

/**
 * Fetch a user's objekts from the indexer with given filters.
 */
export const $fetchObjektsBlockchain = createServerFn({ method: "GET" })
  .inputValidator(
    userCollectionBackendSchema.extend({
      address: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    let query = indexer
      .select({
        objekts,
        collections,
      })
      .from(objekts)
      .leftJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          eq(objekts.owner, data.address.toLowerCase()),
          ...[
            ...withArtist(data.artist),
            ...withClass(data.class ?? []),
            ...withSeason(data.season ?? []),
            ...withOnlineType(data.on_offline ?? []),
            ...withMember(data.member),
            ...withCollections(data.collectionNo),
            ...withTransferable(data.transferable),
            ...withSelectedArtists(data.artists),
          ],
        ),
      )
      .$dynamic();
    query = withCollectionSort(query, data.sort ?? "newest");
    query = query.limit(PER_PAGE).offset(data.page * PER_PAGE);

    // fetch both objekts and total count in parallel
    const [results, total] = await Promise.all([
      query,
      fetchCount(data.address, data),
    ]);

    const hasNext = results.length === PER_PAGE;
    const nextStartAfter = hasNext ? data.page + 1 : undefined;

    return {
      total: Number(total),
      hasNext,
      nextStartAfter,
      objekts: results
        .filter((r) => r.collections !== null) // should never happen but just in case
        .map((row) => mapLegacyObjekt(row.objekts, row.collections!)),
    };
  });

/**
 * Fetch the total number of objekts for a user with given filters.
 */
const fetchCount = createServerOnlyFn(
  async (
    address: string,
    filters: z.infer<typeof userCollectionBackendSchema>,
  ) => {
    const [results] = await indexer
      .select({ count: sql<number>`count(*)` })
      .from(objekts)
      .leftJoin(collections, eq(collections.id, objekts.collectionId))
      .where(
        and(
          eq(objekts.owner, address.toLowerCase()),
          ...[
            ...withArtist(filters.artist),
            ...withClass(filters.class ?? []),
            ...withSeason(filters.season ?? []),
            ...withOnlineType(filters.on_offline ?? []),
            ...withMember(filters.member),
            ...withCollections(filters.collectionNo),
            ...withTransferable(filters.transferable),
            ...withSelectedArtists(filters.artists),
          ],
        ),
      );

    return results?.count ?? 0;
  },
);
