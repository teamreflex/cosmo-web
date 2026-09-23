import { remember } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import type { Collection, Objekt } from "@/lib/server/db/indexer/schema";
import {
  COLLAGE_SIZE,
  pinTokenIds,
  toProfilePins,
} from "@/lib/universal/binders";
import type { ProfilePin } from "@/lib/universal/binders";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { binderEntries } from "@apollo/database/web/schema";
import { isAddress } from "@apollo/util";
import { pinCacheKey } from "@apollo/util-server";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";

interface ObjektWithCollection extends Objekt {
  collection: Collection;
}

/**
 * Fetch all pins for the given user, pinned objekts and pinned binders
 * together in pin order.
 * Cached for 1 day.
 */
export const $fetchPins = createServerFn({ method: "GET" })
  .validator(z.object({ username: z.string() }))
  .handler(async ({ data }): Promise<ProfilePin[]> => {
    const tag = pinCacheKey(data.username);
    const ttl = 60 * 60 * 24; // 1 day

    return await remember(tag, ttl, async () => {
      const column = isAddress(data.username) ? "address" : "username";

      const account = await db.query.cosmoAccounts.findFirst({
        // decoding username from URL
        where: { [column]: decodeURIComponent(data.username) },
        columns: {},
        with: {
          pins: {
            columns: { id: true, tokenId: true },
            orderBy: { position: "asc", id: "asc" },
            with: {
              binder: {
                columns: {
                  id: true,
                  userId: true,
                  slug: true,
                  name: true,
                  colour: true,
                  layout: true,
                  pageCount: true,
                  coverTokenId: true,
                },
                extras: {
                  entryCount: (table) =>
                    db.$count(
                      binderEntries,
                      eq(binderEntries.binderId, table.id),
                    ),
                },
                with: {
                  entries: {
                    columns: { page: true, slot: true, tokenId: true },
                    where: { page: 0 },
                    orderBy: { slot: "asc" },
                    limit: COLLAGE_SIZE,
                  },
                },
              },
            },
          },
        },
      });

      const rows = account?.pins ?? [];
      if (rows.length === 0) return [];

      const tokenIds = pinTokenIds(rows);
      try {
        var results =
          tokenIds.length === 0
            ? []
            : await indexer.query.objekts.findMany({
                where: {
                  id: {
                    in: tokenIds.map(String),
                  },
                },
                with: {
                  collection: true,
                },
              });
      } catch {
        return [];
      }

      return toProfilePins(
        rows,
        new Map(
          results.map((objekt) => [Number(objekt.id), normalizePin(objekt)]),
        ),
      );
    });
  });

/**
 * Normalize an objekt with collection into an owned objekt.
 */
export function normalizePin(objekt: ObjektWithCollection): CosmoObjekt {
  return {
    ...objekt.collection,
    status: "minted",
    transferablebyDefault: true,
    tokenAddress: objekt.collection.contract,
    transferable: objekt.transferable,
    usedForGrid: false,
    lenticularPairTokenId: null,
    mintedAt: objekt.mintedAt,
    receivedAt: objekt.receivedAt,
    tokenId: objekt.id.toString(),
    objektNo: objekt.serial,
    bandImageUrl: objekt.collection.bandImageUrl,
    // SAFETY: the artist column only stores ValidArtist ids
    artists: [objekt.collection.artist] as ValidArtist[],
  };
}
