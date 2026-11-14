import { remember, uncached } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import {
  COLLAGE_SIZE,
  pinTokenIds,
  toProfilePins,
} from "@/lib/universal/binders";
import type { ProfilePin } from "@/lib/universal/binders";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { binderEntries } from "@apollo/database/web/schema";
import { isAddress } from "@apollo/util";
import { pinCacheKey } from "@apollo/util-server";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";

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

      // an identifier with no account gets no key; an account with no pins keeps its empty one
      if (account === undefined) return uncached([]);

      const rows = account.pins;
      if (rows.length === 0) return [];

      const tokenIds = pinTokenIds(rows);
      const results =
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

      return toProfilePins(
        rows,
        new Map(
          results.map((objekt) => [
            Number(objekt.id),
            Objekt.fromRow(objekt, objekt.collection),
          ]),
        ),
      );
    });
  });
