import { toPublicUser } from "@/lib/server/auth.server";
import { db } from "@/lib/server/db";
import { fetchLatestFxRates } from "@/lib/server/objekts/fx.server";
import { fetchSerials } from "@/lib/server/objekts/serials.server";
import type { CollectionListing } from "@/lib/universal/listings";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

/**
 * Every priced serial of a collection across all sale lists, with the price
 * normalised to USD via the latest FX rate and the seller shaped for display.
 * Unpriced entries are not offers and are left out.
 */
export const $fetchCollectionListings = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }): Promise<CollectionListing[]> => {
    const entries = await db.query.objektListEntries.findMany({
      where: {
        collectionId: data.slug,
        tokenId: { isNotNull: true },
        price: { isNotNull: true },
        objektList: { type: "sale" },
      },
      columns: { id: true, tokenId: true, price: true, createdAt: true },
      with: {
        objektList: {
          columns: { id: true, name: true, currency: true },
          with: { user: true },
        },
      },
    });

    const priced = entries.flatMap((entry) => {
      const list = entry.objektList;
      if (
        entry.tokenId === null ||
        entry.price === null ||
        list === null ||
        list.currency === null
      ) {
        return [];
      }
      return [
        {
          id: entry.id,
          createdAt: entry.createdAt,
          tokenId: entry.tokenId,
          price: entry.price,
          currency: list.currency,
          list,
        },
      ];
    });

    const [rates, serials] = await Promise.all([
      fetchLatestFxRates([...new Set(priced.map((e) => e.currency))]),
      fetchSerials(priced.map((e) => e.tokenId)),
    ]);

    return priced.map((entry) => {
      const rate = rates.get(entry.currency);
      const { user } = entry.list;
      return {
        entryId: entry.id,
        tokenId: entry.tokenId,
        serial: serials.get(entry.tokenId) ?? null,
        price: entry.price,
        currency: entry.currency,
        priceUsd: rate === undefined ? null : entry.price * rate,
        listedAt: entry.createdAt.toISOString(),
        list: { id: entry.list.id, name: entry.list.name },
        seller: toPublicUser(user),
        sellerDisplay: user.displayUsername ?? user.name,
      };
    });
  });
