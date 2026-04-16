import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@/lib/server/db/indexer/schema";
import type { Collection } from "@/lib/server/db/indexer/schema";
import {
  withArtist,
  withClass,
  withMember,
  withObjektListEntries,
  withOnlineType,
  withSeason,
} from "@/lib/server/objekts/filters.server";
import { objektListBackendSchema } from "@/lib/universal/parsers";
import { createServerFn } from "@tanstack/react-start";
import { and, inArray } from "drizzle-orm";
import * as z from "zod";

const LIMIT = 60;

export type ObjektListItem = Collection & {
  entryQuantity: number;
  entryPrice: number | null;
  entryTokenId: string | null;
  entrySerial: number | null;
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
 * card per serial. Have lists sort by entry creation; other types defer to
 * the indexer sort.
 */
export const $fetchObjektListEntries = createServerFn({ method: "GET" })
  .inputValidator(
    objektListBackendSchema.extend({
      objektListId: z.uuid(),
    }),
  )
  .handler(async ({ data }): Promise<FetchObjektListEntries> => {
    const list = await db.query.objektLists.findFirst({
      where: { id: data.objektListId },
      columns: { type: true },
    });

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

    const tokenIds = entries
      .map((e) => e.tokenId)
      .filter((id): id is string => id !== null);
    const serialByTokenId =
      tokenIds.length > 0
        ? new Map(
            (
              await indexer
                .select({ id: objekts.id, serial: objekts.serial })
                .from(objekts)
                .where(inArray(objekts.id, tokenIds))
            ).map((o) => [o.id, o.serial]),
          )
        : new Map<string, number>();

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
      });
    }

    if (list?.type === "have") {
      // serials added later appear first
      items.sort((a, b) => {
        const ai = entries.findIndex((e) => e.id === a.id);
        const bi = entries.findIndex((e) => e.id === b.id);
        const ad = entries[ai]?.createdAt ?? "";
        const bd = entries[bi]?.createdAt ?? "";
        return bd.localeCompare(ad);
      });
    } else {
      sortByIndexerOrder(items, data.sort ?? "newest");
    }

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
 * In-memory port of the indexer-side sort for non-have lists, applied after
 * entry projection so per-entry rendering stays consistent across types.
 */
function sortByIndexerOrder(items: ObjektListItem[], sort: string) {
  switch (sort) {
    case "oldest":
      items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return;
    case "noAscending":
      items.sort((a, b) => a.collectionNo.localeCompare(b.collectionNo));
      return;
    case "noDescending":
      items.sort((a, b) => b.collectionNo.localeCompare(a.collectionNo));
      return;
    case "newest":
    default:
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
