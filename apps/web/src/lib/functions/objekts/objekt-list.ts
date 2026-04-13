import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections } from "@/lib/server/db/indexer/schema";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withMember,
  withObjektIndexSort,
  withObjektListEntries,
  withOnlineType,
  withSeason,
} from "@/lib/server/objekts/filters.server";
import { objektListBackendSchema } from "@/lib/universal/parsers";
import { createServerFn } from "@tanstack/react-start";
import { and, sql } from "drizzle-orm";
import * as z from "zod";

const LIMIT = 60;

export type ObjektListItem = Collection & {
  entryQuantity: number;
  entryPrice: number | null;
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
 * Fetch objekts from the indexer with given filters.
 */
export const $fetchObjektListEntries = createServerFn({ method: "GET" })
  .inputValidator(
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
        quantity: true,
        price: true,
      },
      with: {
        priceStats: {
          columns: {
            medianPriceUsd: true,
            listingCount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // handle empty list
    if (entries.length === 0) {
      return {
        total: 0,
        hasNext: false,
        nextStartAfter: undefined,
        objekts: [],
      };
    }

    let query = indexer
      .select({
        count: sql<number>`count(*) OVER() AS count`,
        collection: collections,
      })
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
      )
      .$dynamic();
    query = withObjektIndexSort(query, data.sort ?? "newest");
    query = query.limit(LIMIT).offset(data.page * LIMIT);

    const result = await query;

    const entryMap = new Map(
      entries.map((e) => [
        e.collectionId,
        {
          id: e.id,
          quantity: e.quantity,
          price: e.price,
          medianPriceUsd: e.priceStats?.medianPriceUsd ?? null,
          listingCount: e.priceStats?.listingCount ?? 0,
        },
      ]),
    );
    const collectionList = result
      .map((c) => {
        const entry = entryMap.get(c.collection.slug);
        if (!entry) return undefined;
        return {
          ...c.collection,
          id: entry.id,
          entryQuantity: entry.quantity,
          entryPrice: entry.price,
          medianPriceUsd: entry.medianPriceUsd,
          listingCount: entry.listingCount,
        };
      })
      .filter((c): c is ObjektListItem => c !== undefined);

    const hasNext = collectionList.length === LIMIT;
    const nextStartAfter = hasNext ? data.page + 1 : undefined;

    return {
      total: Number(result[0]?.count ?? 0),
      hasNext,
      nextStartAfter,
      objekts: collectionList,
    };
  });
