import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import {
  collections,
  collectionStats,
  members,
  objekts,
} from "@/lib/server/db/indexer/schema";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  mintCount,
  withArtist,
  withClass,
  withMember,
  withObjektListEntries,
  withOnlineType,
  withSeason,
} from "@/lib/server/objekts/filters.server";
import { sortObjektListItems } from "@/lib/universal/objekt-list-sort";
import { objektListBackendSchema } from "@/lib/universal/parsers";
import { isMemberSort, isMintSort } from "@apollo/cosmo/types/common";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod";

const LIMIT = 60;

export type ObjektListItem = Collection & {
  entryQuantity: number;
  entryPrice: number | null;
  entryTokenId: string | null;
  entrySerial: number | null;
  entryCreatedAt: string;
  medianPriceUsd: number | null;
  listingCount: number;
};

type FetchObjektListEntries = {
  total: number;
  hasNext: boolean;
  nextStartAfter: number | undefined;
  objekts: ObjektListItem[];
};

/**
 * Fetch list entries joined with their indexer collection (and serial, when
 * the entry is keyed to a specific token). Each entry produces its own card,
 * so a have list with multiple serials of the same collection renders one
 * card per serial.
 */
export const $fetchObjektListEntries = createServerFn({ method: "GET" })
  .validator(
    objektListBackendSchema.extend({
      objektListId: z.uuid(),
    }),
  )
  .handler(async ({ data }): Promise<FetchObjektListEntries> => {
    const entries = await db.query.objektListEntries.findMany({
      where: { objektListId: data.objektListId },
      columns: {
        id: true,
        collectionId: true,
        tokenId: true,
        quantity: true,
        price: true,
        createdAt: true,
      },
      with: {
        priceStats: {
          columns: {
            medianPriceUsd: true,
            listingCount: true,
          },
        },
      },
    });

    if (entries.length === 0) {
      return {
        total: 0,
        hasNext: false,
        nextStartAfter: undefined,
        objekts: [],
      };
    }

    const matchingCollections = await indexer
      .select()
      .from(collections)
      .where(
        and(
          ...withObjektListEntries(entries.map((e) => e.collectionId)),
          ...withArtist(data.artist),
          ...withClass(data.class ?? []),
          ...withSeason(data.season ?? []),
          ...withOnlineType(data.on_offline ?? []),
          ...withMember(data.member),
        ),
      );

    const collectionsBySlug = new Map(
      matchingCollections.map((c) => [c.slug, c]),
    );

    const serialByTokenId = await fetchSerials(
      entries.map((e) => e.tokenId).filter((id): id is string => id !== null),
    );

    const items: ObjektListItem[] = [];
    for (const entry of entries) {
      const collection = collectionsBySlug.get(entry.collectionId);
      if (!collection) continue;
      items.push({
        ...collection,
        id: entry.id,
        entryQuantity: entry.quantity,
        entryPrice: entry.price,
        entryTokenId: entry.tokenId,
        entrySerial:
          entry.tokenId !== null
            ? (serialByTokenId.get(entry.tokenId) ?? null)
            : null,
        entryCreatedAt: entry.createdAt.toISOString(),
        medianPriceUsd: entry.priceStats?.medianPriceUsd ?? null,
        listingCount: entry.priceStats?.listingCount ?? 0,
      });
    }

    const sort = data.sort ?? "newest";
    const [memberOrder, mintCounts] = await Promise.all([
      isMemberSort(sort) ? fetchMemberOrder() : undefined,
      isMintSort(sort)
        ? fetchMintCounts(matchingCollections.map((c) => c.id))
        : undefined,
    ]);
    sortObjektListItems(items, sort, { memberOrder, mintCounts });

    const total = items.length;
    const start = data.page * LIMIT;
    const page = items.slice(start, start + LIMIT);
    const hasNext = start + LIMIT < total;

    return {
      total,
      hasNext,
      nextStartAfter: hasNext ? data.page + 1 : undefined,
      objekts: page,
    };
  });

/**
 * Fetch serials from the indexer for the given token IDs.
 */
async function fetchSerials(tokenIds: string[]) {
  if (tokenIds.length === 0) {
    return new Map<string, number>();
  }

  const result = await indexer
    .select({ id: objekts.id, serial: objekts.serial })
    .from(objekts)
    .where(inArray(objekts.id, tokenIds));

  return new Map(result.map((o) => [o.id, o.serial]));
}

/**
 * Load the member name → canonical sort order map from the indexer.
 */
async function fetchMemberOrder() {
  const rows = await indexer
    .select({ name: members.name, sortOrder: members.sortOrder })
    .from(members);
  return new Map(rows.map((r) => [r.name, r.sortOrder]));
}

/**
 * Load the collection slug → mint count map for the given collections.
 */
async function fetchMintCounts(collectionIds: string[]) {
  if (collectionIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await indexer
    .select({ slug: collections.slug, mintCount })
    .from(collectionStats)
    .innerJoin(collections, eq(collections.id, collectionStats.collectionId))
    .where(inArray(collectionStats.collectionId, collectionIds));
  return new Map(rows.map((r) => [r.slug, r.mintCount]));
}
