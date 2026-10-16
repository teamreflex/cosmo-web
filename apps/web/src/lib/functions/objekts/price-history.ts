import { remember } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import {
  type PriceHistory,
  priceHistoryRangeDays,
  priceHistoryRanges,
} from "@/lib/universal/objekts";
import { createServerFn } from "@tanstack/react-start";
import { subDays } from "date-fns";
import * as z from "zod";

/**
 * Daily floor/median/listing-count snapshots in the range for the pricing
 * tab chart, plus when tracking started regardless of range. A collection's
 * snapshots are cached until the next run of the job that writes them.
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
  .handler(async ({ data }): Promise<PriceHistory> => {
    // cached per collection, not range: tracking spans every snapshot
    const snapshots = await remember(
      `price-history:${data.slug}`,
      secondsUntilNextSnapshot(),
      () =>
        db.query.collectionPriceHistory.findMany({
          where: { collectionId: data.slug },
          columns: {
            date: true,
            floorUsd: true,
            medianUsd: true,
            listingCount: true,
          },
          orderBy: { date: "asc" },
        }),
    );
    const start =
      data.range === "all"
        ? undefined
        : rangeStart(priceHistoryRangeDays[data.range]);
    const first = snapshots[0];

    return {
      points:
        start === undefined
          ? snapshots
          : snapshots.filter((point) => point.date >= start),
      tracking:
        first === undefined
          ? null
          : { since: first.date, snapshots: snapshots.length },
    };
  });

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
