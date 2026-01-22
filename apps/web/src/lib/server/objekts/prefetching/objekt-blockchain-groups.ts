import { userCollectionBackendSchema } from "@/lib/universal/parsers";
import type { ValidSort } from "@apollo/cosmo/types/common";
import type {
  BFFCollectionGroup,
  BFFCollectionGroupResponse,
} from "@apollo/cosmo/types/objekts";
import { Addresses, isEqual } from "@apollo/util";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import type { PgSelect } from "drizzle-orm/pg-core";
import * as z from "zod";
import { indexer } from "../../db/indexer";
import { collections, objekts } from "../../db/indexer/schema";
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

export const PER_PAGE = 30;

/**
 * Fetch a user's collection groups from the indexer with given filters.
 */
export const $fetchObjektsBlockchainGroups = createServerFn({ method: "GET" })
  .inputValidator(
    userCollectionBackendSchema.extend({
      address: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    // query is too slow for the spin account
    if (isEqual(data.address, Addresses.SPIN)) {
      return { collectionCount: 0, collections: [] };
    }

    const offset = (data.page - 1) * PER_PAGE;
    const sort = data.sort ?? "newest";
    const address = data.address.toLowerCase();

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
      sort === "noDescending";

    let idsQuery = requiresCollectionJoin
      ? indexer
          .select({
            collectionId: collections.id,
            collectionNo: collections.collectionNo,
            totalCount: sql<number>`count(*) over ()::int`.mapWith(Number),
          })
          .from(objekts)
          .innerJoin(collections, eq(objekts.collectionId, collections.id))
          .where(and(...objektFilters, ...collectionFilters))
          .groupBy(collections.id, collections.collectionNo)
          .$dynamic()
      : indexer
          .select({
            collectionId: objekts.collectionId,
            totalCount: sql<number>`count(*) over ()::int`.mapWith(Number),
          })
          .from(objekts)
          .where(and(...objektFilters))
          .groupBy(objekts.collectionId)
          .$dynamic();

    idsQuery = withObjektGroupSort(
      idsQuery,
      sort,
      requiresCollectionJoin ? collections.id : objekts.collectionId,
    );
    idsQuery = idsQuery.limit(PER_PAGE).offset(offset);

    const idsResult = await idsQuery;
    const totalCount = idsResult[0]?.totalCount ?? 0;

    if (idsResult.length === 0) {
      return { collectionCount: 0, collections: [] };
    }

    const collectionIds = idsResult.map((r) => r.collectionId);

    // 2. fetch collections and objekts separately in parallel
    const objektsQuery = requiresCollectionJoin
      ? indexer
          .select({
            collectionId: objekts.collectionId,
            id: objekts.id,
            serial: objekts.serial,
            transferable: objekts.transferable,
            owner: objekts.owner,
            mintedAt: objekts.mintedAt,
            receivedAt: objekts.receivedAt,
          })
          .from(objekts)
          .innerJoin(collections, eq(objekts.collectionId, collections.id))
      : indexer
          .select({
            collectionId: objekts.collectionId,
            id: objekts.id,
            serial: objekts.serial,
            transferable: objekts.transferable,
            owner: objekts.owner,
            mintedAt: objekts.mintedAt,
            receivedAt: objekts.receivedAt,
          })
          .from(objekts);

    const [collectionsResult, objektsResult] = await Promise.all([
      // 2a. fetch collections
      indexer
        .select({
          id: collections.id,
          collectionId: collections.collectionId,
          season: collections.season,
          collectionNo: collections.collectionNo,
          class: collections.class,
          member: collections.member,
          artist: collections.artist,
          thumbnailImage: collections.thumbnailImage,
          frontImage: collections.frontImage,
          backImage: collections.backImage,
          accentColor: collections.accentColor,
          backgroundColor: collections.backgroundColor,
          textColor: collections.textColor,
          comoAmount: collections.comoAmount,
          bandImageUrl: collections.bandImageUrl,
          frontMedia: collections.frontMedia,
          createdAt: collections.createdAt,
        })
        .from(collections)
        .where(inArray(collections.id, collectionIds)),

      // 2b. fetch objekts
      objektsQuery.where(
        and(
          eq(objekts.owner, address),
          inArray(objekts.collectionId, collectionIds),
          ...withTransferable(data.transferable),
        ),
      ),
    ]);

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
    const resultCollections: BFFCollectionGroup[] = [];
    for (const colId of collectionIds) {
      const col = collectionsMap.get(colId);
      if (!col) continue;

      const colObjekts = objektsByCollection.get(colId) ?? [];
      const mapped = colObjekts.map((obj) => ({
        metadata: {
          collectionId: col.collectionId,
          objektNo: obj.serial,
          tokenId: Number(obj.id),
          transferable: obj.transferable,
        },
        inventory: {
          objektId: Number(obj.id),
          owner: obj.owner,
          status: "minted" as const,
          usedForGrid: false,
          lenticularPairTokenId: 0,
          mintedAt: obj.mintedAt,
          acquiredAt: obj.receivedAt,
          updatedAt: obj.receivedAt,
        },
        nonTransferableReason: nonTransferableReason(
          col.class,
          obj.transferable,
        ),
      }));

      resultCollections.push({
        collection: {
          collectionId: col.collectionId,
          season: col.season,
          collectionNo: col.collectionNo,
          class: col.class,
          member: col.member,
          // @ts-expect-error - can't pull artistMember from the indexer
          artistMember: null,
          artistName: col.artist,
          thumbnailImage: col.thumbnailImage,
          frontImage: col.frontImage,
          backImage: col.backImage,
          accentColor: col.accentColor,
          backgroundColor: col.backgroundColor,
          textColor: col.textColor,
          comoAmount: col.comoAmount,
          bandImageUrl: col.bandImageUrl,
          frontMedia: col.frontMedia,
          transferableByDefault: true,
          gridableByDefault: false,
          createdAt: col.createdAt,
          updatedAt: col.createdAt,
        },
        count: mapped.length,
        objekts: mapped,
      });
    }

    return {
      collectionCount: totalCount,
      collections: resultCollections,
    } satisfies BFFCollectionGroupResponse;
  });

/**
 * Custom sorting filters as collection groups have a different mechanism for sorting.
 */
const withObjektGroupSort = createServerOnlyFn(
  <T extends PgSelect>(
    qb: T,
    sort: ValidSort,
    tieBreaker: typeof collections.id | typeof objekts.collectionId,
  ) => {
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
    }
  },
);
