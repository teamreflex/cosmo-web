import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import * as z from "zod";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { collections, objekts } from "../../db/indexer/schema";
import { indexer } from "../../db/indexer";
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
import type { ValidSort } from "@apollo/cosmo/types/common";
import type { PgSelect } from "drizzle-orm/pg-core";
import type {
  BFFCollectionGroup,
  BFFCollectionGroupResponse,
} from "@apollo/cosmo/types/objekts";
import { userCollectionBackendSchema } from "@/lib/universal/parsers";

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
    const offset = (data.page - 1) * PER_PAGE;
    const sort = data.sort ?? "newest";

    // build common filters
    const filters = and(
      eq(objekts.owner, data.address.toLowerCase()),
      ...[
        ...withArtist(data.artist),
        ...withClass(data.class ?? []),
        ...withSeason(data.season ?? []),
        ...withOnlineType(data.on_offline ?? []),
        ...withMember(data.member),
        ...withTransferable(data.transferable),
        ...withSelectedArtists(data.artists),
      ],
    );

    // 1. fetch collection count and IDs in parallel
    let idsQuery = indexer
      .select({
        collectionId: collections.id,
        newestReceivedAt: max(objekts.receivedAt),
        maxSerial: max(objekts.serial),
        collectionNo: collections.collectionNo,
      })
      .from(objekts)
      .innerJoin(collections, eq(objekts.collectionId, collections.id))
      .where(filters)
      .groupBy(collections.id, collections.collectionNo)
      .$dynamic();

    idsQuery = withObjektGroupSort(idsQuery, sort);
    idsQuery = idsQuery.limit(PER_PAGE).offset(offset);

    const [countResult, idsResult] = await Promise.all([
      indexer
        .select({
          count: sql<number>`count(distinct ${collections.id})`.mapWith(Number),
        })
        .from(objekts)
        .innerJoin(collections, eq(objekts.collectionId, collections.id))
        .where(filters),
      idsQuery,
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    if (idsResult.length === 0) {
      return { collectionCount: 0, collections: [] };
    }

    const collectionIds = idsResult.map((r) => r.collectionId);

    // 2. fetch collections and objekts separately in parallel
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
      indexer
        .select({
          collectionId: objekts.collectionId,
          collectionSlug: collections.collectionId,
          id: objekts.id,
          serial: objekts.serial,
          transferable: objekts.transferable,
          owner: objekts.owner,
          mintedAt: objekts.mintedAt,
          receivedAt: objekts.receivedAt,
        })
        .from(objekts)
        .innerJoin(collections, eq(objekts.collectionId, collections.id))
        .where(
          and(
            eq(objekts.owner, data.address.toLowerCase()),
            inArray(objekts.collectionId, collectionIds),
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
          collectionId: obj.collectionSlug,
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
  <T extends PgSelect>(qb: T, sort: ValidSort) => {
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
  },
);
