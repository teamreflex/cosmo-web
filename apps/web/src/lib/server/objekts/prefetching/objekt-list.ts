import { and, sql } from "drizzle-orm";
import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import {
  withArtist,
  withClass,
  withMember,
  withObjektIndexSort,
  withObjektListEntries,
  withOnlineType,
  withSeason,
} from "../filters";
import { indexer } from "../../db/indexer";
import { collections } from "../../db/indexer/schema";
import { db } from "../../db";
import type { Collection } from "../../db/indexer/schema";
import { objektListBackendSchema } from "@/lib/universal/parsers";

const LIMIT = 60;

type FetchObjektListEntries = {
  total: number;
  hasNext: boolean;
  nextStartAfter: number | undefined;
  objekts: Collection[];
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
        collections,
      })
      .from(collections)
      .where(
        and(
          ...[
            ...withObjektListEntries(entries.map((e) => e.collectionId)),
            ...withArtist(data.artist),
            ...withClass(data.class ?? []),
            ...withSeason(data.season ?? []),
            ...withOnlineType(data.on_offline ?? []),
            ...withMember(data.member),
          ],
        ),
      )
      .$dynamic();
    query = withObjektIndexSort(query, data.sort ?? "newest");
    query = query.limit(LIMIT).offset(data.page * LIMIT);

    const result = await query;
    const flatCollections = result.map((c) => c.collections);

    const collectionMap = new Map(flatCollections.map((c) => [c.slug, c]));

    const collectionList = entries
      .map((entry) => {
        const collection = collectionMap.get(entry.collectionId);
        if (!collection) return undefined;
        return {
          ...collection,
          // map the entryId into the collection for uniqueness
          id: entry.id.toString(),
        };
      })
      .filter((c): c is Collection => c !== undefined);

    const hasNext = collectionList.length === LIMIT;
    const nextStartAfter = hasNext ? data.page + 1 : undefined;

    return {
      total: Number(result[0]?.count ?? 0),
      hasNext,
      nextStartAfter,
      objekts: collectionList,
    };
  });
