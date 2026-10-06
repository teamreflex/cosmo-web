import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, members } from "@/lib/server/db/indexer/schema";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withMember,
  withObjektListEntries,
  withOnlineType,
  withSeason,
} from "@/lib/server/objekts/filters.server";
import {
  fetchMarketStats,
  isFloorPrice,
} from "@/lib/server/objekts/market.server";
import { fetchSerials } from "@/lib/server/objekts/serials.server";
import { objektListBackendSchema } from "@/lib/universal/parsers";
import { isMemberSort } from "@apollo/cosmo/types/common";
import { createServerFn } from "@tanstack/react-start";
import { and } from "drizzle-orm";
import * as z from "zod";

const LIMIT = 60;

export type ObjektListItem = Collection & {
  entryQuantity: number;
  entryPrice: number | null;
  entryTokenId: string | null;
  entrySerial: number | null;
  entryCreatedAt: string;
  // a priced sale serial at its collection's market floor
  entryAtFloor: boolean;
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
 * card per serial. Sale list serials are flagged when they're at the market
 * floor of their collection.
 */
export const $fetchObjektListEntries = createServerFn({ method: "GET" })
  .validator(
    objektListBackendSchema.extend({
      objektListId: z.uuid(),
    }),
  )
  .handler(async ({ data }): Promise<FetchObjektListEntries> => {
    const list = await db.query.objektLists.findFirst({
      where: { id: data.objektListId },
      columns: { type: true },
      with: {
        entries: {
          columns: {
            id: true,
            collectionId: true,
            tokenId: true,
            quantity: true,
            price: true,
            createdAt: true,
          },
        },
        // latest rate for a sale list's currency
        fxRates: {
          columns: { rateToUsd: true },
          orderBy: { date: "desc" },
          limit: 1,
        },
      },
    });

    if (list === undefined || list.entries.length === 0) {
      return {
        total: 0,
        hasNext: false,
        nextStartAfter: undefined,
        objekts: [],
      };
    }

    const { entries } = list;
    const rateToUsd = list.fxRates[0]?.rateToUsd;
    const [matchingCollections, marketStats] = await Promise.all([
      indexer
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
        ),
      list.type === "sale" && rateToUsd !== undefined
        ? fetchMarketStats([
            ...new Set(
              entries.flatMap((e) =>
                e.tokenId !== null && e.price !== null ? [e.collectionId] : [],
              ),
            ),
          ])
        : undefined,
    ]);

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
        entryAtFloor:
          marketStats !== undefined &&
          rateToUsd !== undefined &&
          entry.tokenId !== null &&
          entry.price !== null &&
          isFloorPrice(
            entry.price * rateToUsd,
            marketStats.get(entry.collectionId),
          ),
      });
    }

    const sort = data.sort ?? "newest";
    const memberOrder = isMemberSort(sort)
      ? await fetchMemberOrder()
      : undefined;
    sortObjektListItems(items, sort, memberOrder);

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
 * Sort list items by the selected sort, applied after entry projection so
 * per-entry rendering stays consistent across types. Newest/oldest order by
 * when the entry was added to the list (not when the collection released),
 * and other sorts break ties between entries of the same collection the
 * same way.
 */
function sortObjektListItems(
  items: ObjektListItem[],
  sort: string,
  memberOrder: Map<string, number> | undefined,
) {
  // newest-added entry first, also breaks ties within a collection
  const newestAdded = (a: ObjektListItem, b: ObjektListItem) =>
    b.entryCreatedAt.localeCompare(a.entryCreatedAt);

  switch (sort) {
    case "oldest":
      items.sort((a, b) => a.entryCreatedAt.localeCompare(b.entryCreatedAt));
      return;
    case "noAscending":
      items.sort(
        (a, b) =>
          a.collectionNo.localeCompare(b.collectionNo) || newestAdded(a, b),
      );
      return;
    case "noDescending":
      items.sort(
        (a, b) =>
          b.collectionNo.localeCompare(a.collectionNo) || newestAdded(a, b),
      );
      return;
    case "memberAsc":
      items.sort(
        (a, b) =>
          memberRank(a, memberOrder) - memberRank(b, memberOrder) ||
          a.collectionNo.localeCompare(b.collectionNo) ||
          newestAdded(a, b),
      );
      return;
    case "memberDesc":
      items.sort(
        (a, b) =>
          memberRank(b, memberOrder) - memberRank(a, memberOrder) ||
          a.collectionNo.localeCompare(b.collectionNo) ||
          newestAdded(a, b),
      );
      return;
    case "newest":
    default:
      items.sort(newestAdded);
  }
}

/**
 * Resolve a member's canonical sort position, falling back to last for any
 * member missing from the synced member table.
 */
function memberRank(item: ObjektListItem, memberOrder?: Map<string, number>) {
  return memberOrder?.get(item.member) ?? Number.MAX_SAFE_INTEGER;
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
