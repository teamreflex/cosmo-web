import type { ValidSort } from "@/lib/universal/cosmo/common";
import { and, asc, desc, eq, max, sql } from "drizzle-orm";
import type { PgSelect } from "drizzle-orm/pg-core";
import { collections, objekts } from "../../db/indexer/schema";
import type { z } from "zod/v4";
import type { userCollectionGroups } from "@/lib/universal/parsers";
import { indexer } from "../../db/indexer";
import type {
  BFFCollectionGroup,
  BFFCollectionGroupObjekt,
  BFFCollectionGroupResponse,
} from "@/lib/universal/cosmo/objekts";
import {
  withArtist,
  withClass,
  withMember,
  withOnlineType,
  withSeason,
  withSelectedArtists,
  withTransferable,
} from "../filters";
import { nonTransferableReason } from "./common";

const PER_PAGE = 30;

/**
 * Ensures the Zod-parsed filters match what the frontend parses.
 * Used for hydrating the query client.
 */
export function parseUserCollectionGroupsFilters(
  filters: z.infer<typeof userCollectionGroups>
) {
  return {
    artist: filters.artistName,
    class: filters.class.length > 0 ? filters.class : null,
    collection: null,
    collectionNo: null,
    gridable: null,
    member: filters.member,
    on_offline: filters.on_offline.length > 0 ? filters.on_offline : null,
    season: filters.season.length > 0 ? filters.season : null,
    sort: filters.order === "newest" ? null : filters.order,
    transferable: null,
    used_for_grid: null,
  };
}

/**
 * Fetch a user's collection groups from the indexer with given filters.
 */
export async function fetchObjektsBlockchainGroups(
  address: string,
  filters: z.infer<typeof userCollectionGroups>
) {
  const offset = (filters.page - 1) * PER_PAGE;

  // main query with pagination and filters
  let query = indexer
    .select({
      collection: {
        collectionId: collections.collectionId,
        season: collections.season,
        collectionNo: collections.collectionNo,
        class: collections.class,
        member: collections.member,
        artistMember: sql<null>`null`,
        artistName: collections.artist,
        thumbnailImage: collections.thumbnailImage,
        frontImage: collections.frontImage,
        backImage: collections.backImage,
        accentColor: collections.accentColor,
        backgroundColor: collections.backgroundColor,
        textColor: collections.textColor,
        comoAmount: collections.comoAmount,
        transferableByDefault: sql<boolean>`true`,
        gridableByDefault: sql<boolean>`false`,
        createdAt: collections.createdAt,
        updatedAt: collections.createdAt, // using createdAt as a fallback
      },
      // use a window function to get the total count without pagination
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
      // calculate the newest receivedAt date for sorting
      newestReceivedAt: max(objekts.receivedAt),
      objekts: sql<BFFCollectionGroupObjekt[]>`array_agg(
      jsonb_build_object(
        'metadata', jsonb_build_object(
          'collectionId', ${collections.collectionId},
          'objektNo', ${objekts.serial}::int,
          'tokenId', ${objekts.id}::int,
          'transferable', ${objekts.transferable}
        ),
        'inventory', jsonb_build_object(
          'objektId', ${objekts.id},
          'owner', ${objekts.owner},
          'status', 'minted',
          'usedForGrid', false,
          'lenticularPairTokenId', 0,
          'mintedAt', ${objekts.mintedAt},
          'acquiredAt', ${objekts.receivedAt},
          'updatedAt', ${objekts.receivedAt}
        )
      )
    )`,
    })
    .from(collections)
    .innerJoin(objekts, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, address.toLowerCase()),
        ...[
          ...withArtist(filters.artistName),
          ...withClass(filters.class),
          ...withSeason(filters.season),
          ...withOnlineType(filters.on_offline),
          ...withMember(filters.member),
          ...withTransferable(filters.transferable),
          ...withSelectedArtists(filters.artists),
        ]
      )
    )
    .groupBy(
      collections.id,
      collections.collectionId,
      collections.season,
      collections.collectionNo,
      collections.class,
      collections.member,
      collections.artist,
      collections.thumbnailImage,
      collections.frontImage,
      collections.backImage,
      collections.accentColor,
      collections.backgroundColor,
      collections.textColor,
      collections.comoAmount,
      collections.createdAt
    )
    .$dynamic();

  query = withObjektGroupSort(query, filters.order);
  query = query.limit(PER_PAGE).offset(offset);

  const result = await query;

  // pull total collection count off the first row
  const totalCount = result?.[0]?.totalCount ?? 0;

  // format the response to match the required structure
  return {
    collectionCount: totalCount,
    collections: result.map((item): BFFCollectionGroup => {
      const objekts = (item.objekts || []).map((objekt) => {
        // apply the non-transferable reason to each objekt
        return {
          ...objekt,
          nonTransferableReason: nonTransferableReason(
            item.collection.class,
            objekt.metadata.transferable
          ),
        };
      });

      return {
        // @ts-expect-error - can't pull artistMember from the indexer
        collection: item.collection,
        count: objekts.length,
        objekts,
      };
    }),
  } satisfies BFFCollectionGroupResponse;
}

/**
 * Custom sorting filters as collection groups have a different mechanism for sorting.
 */
function withObjektGroupSort<T extends PgSelect>(qb: T, sort: ValidSort) {
  switch (sort) {
    case "newest":
      return qb.orderBy(desc(max(objekts.receivedAt)), asc(collections.id));
    case "oldest":
      return qb.orderBy(asc(max(objekts.receivedAt)), asc(collections.id));
    case "noAscending":
      return qb.orderBy(asc(collections.collectionNo), asc(collections.id));
    case "noDescending":
      return qb.orderBy(desc(collections.collectionNo), asc(collections.id));
    case "serialAsc":
      return qb.orderBy(asc(max(objekts.serial)), asc(collections.id));
    case "serialDesc":
      return qb.orderBy(desc(max(objekts.serial)), asc(collections.id));
  }
}
