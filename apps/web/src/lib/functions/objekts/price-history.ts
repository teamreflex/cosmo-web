import { remember } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import {
  type PriceHistory,
  priceHistoryRangeDays,
  priceHistoryRanges,
} from "@/lib/universal/objekts";
import { collectionPriceHistory } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { subDays } from "date-fns";
import { count, eq, min } from "drizzle-orm";
import * as z from "zod";

/**
 * Daily floor/median/listing-count snapshots for the pricing tab chart, plus
 * when tracking started regardless of range, cached for the 4 hours between
 * runs of the job that writes them.
 */
export const $fetchPriceHistory = createServerFn({ method: "GET" })
  .validator(
    z.object({
      /**
       * Lowercased to match the stored slugs, since `remember` lowercases the
       * cache key and a mixed-case request would otherwise cache an empty chart.
       */
      slug: z.string().max(36).toLowerCase(),
      range: z.enum(priceHistoryRanges),
    }),
  )
  .handler(async ({ data }) =>
    remember(
      `price-history:${data.slug}:${data.range}`,
      60 * 60 * 4,
      async (): Promise<PriceHistory> => {
        const [points, [tracking]] = await Promise.all([
          db.query.collectionPriceHistory.findMany({
            where: {
              collectionId: data.slug,
              ...(data.range !== "all" && {
                date: { gte: rangeStart(priceHistoryRangeDays[data.range]) },
              }),
            },
            columns: {
              date: true,
              floorUsd: true,
              medianUsd: true,
              listingCount: true,
            },
            orderBy: { date: "asc" },
          }),
          db
            .select({
              since: min(collectionPriceHistory.date),
              snapshots: count(),
            })
            .from(collectionPriceHistory)
            .where(eq(collectionPriceHistory.collectionId, data.slug)),
        ]);

        return {
          points,
          tracking:
            tracking === undefined || tracking.since === null
              ? null
              : { since: tracking.since, snapshots: tracking.snapshots },
        };
      },
    ),
  );

/**
 * UTC date string `days` ago, matching the `date` column the job writes.
 */
function rangeStart(days: number) {
  return subDays(new Date(), days).toISOString().slice(0, 10);
}
