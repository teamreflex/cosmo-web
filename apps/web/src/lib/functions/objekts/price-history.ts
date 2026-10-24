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
 * when tracking started regardless of range, cached until the next run of
 * the job that writes them.
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
      secondsUntilNextSnapshot(),
      async (): Promise<PriceHistory> => {
        const points = await db.query.collectionPriceHistory.findMany({
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
        });

        // the full range already holds every snapshot
        if (data.range === "all") {
          const first = points[0];
          return {
            points,
            tracking:
              first === undefined
                ? null
                : { since: first.date, snapshots: points.length },
          };
        }

        const [tracking] = await db
          .select({
            since: min(collectionPriceHistory.date),
            snapshots: count(),
          })
          .from(collectionPriceHistory)
          .where(eq(collectionPriceHistory.collectionId, data.slug));

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

const SNAPSHOT_INTERVAL = 4 * 60 * 60 * 1000;

/**
 * Seconds until shortly after the next run of `sync-collection-price-stats`
 * in `apps/schedules`, which runs at every 4th UTC hour. The margin covers
 * the run itself.
 */
function secondsUntilNextSnapshot() {
  return (
    Math.ceil((SNAPSHOT_INTERVAL - (Date.now() % SNAPSHOT_INTERVAL)) / 1000) +
    5 * 60
  );
}
