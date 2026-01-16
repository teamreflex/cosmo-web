import { objektListBackendSchema } from "@/lib/universal/parsers";
import { createServerFn } from "@tanstack/react-start";
import { and, sql } from "drizzle-orm";
import * as z from "zod";
import { db } from "../../db";
import { indexer } from "../../db/indexer";
import { collections } from "../../db/indexer/schema";
import type { Collection } from "../../db/indexer/schema";
import {
  withArtist,
  withClass,
  withMember,
  withObjektIndexSort,
  withObjektListEntries,
  withOnlineType,
  withSeason,
} from "../filters";

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

    const idMap = new Map(entries.map((e) => [e.collectionId, e.id]));
    const collectionList = result
      .map((c) => ({
        ...c.collection,
        id: idMap.get(c.collection.slug),
      }))
      .filter((c): c is Collection => c.id !== undefined);

    const hasNext = collectionList.length === LIMIT;
    const nextStartAfter = hasNext ? data.page + 1 : undefined;

    return {
      total: Number(result[0]?.count ?? 0),
      hasNext,
      nextStartAfter,
      objekts: collectionList,
    };
  });
