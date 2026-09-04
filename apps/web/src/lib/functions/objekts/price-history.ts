import { remember } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import {
  type PriceHistoryPoint,
  type PriceHistoryRange,
  priceHistoryRanges,
} from "@/lib/universal/objekts";
import { createServerFn } from "@tanstack/react-start";
import { subDays } from "date-fns";
import * as z from "zod";

const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} satisfies Record<Exclude<PriceHistoryRange, "all">, number>;

/**
 * Daily floor/median/listing-count snapshots for the pricing tab chart,
 * cached for the 4 hours between runs of the job that writes them.
 */
export const $fetchPriceHistory = createServerFn({ method: "GET" })
  .validator(
    z.object({
      slug: z.string(),
      range: z.enum(priceHistoryRanges),
    }),
  )
  .handler(async ({ data }): Promise<PriceHistoryPoint[]> =>
    remember(`price-history:${data.slug}:${data.range}`, 60 * 60 * 4, () =>
      db.query.collectionPriceHistory.findMany({
        where: {
          collectionId: data.slug,
          ...(data.range !== "all" && {
            date: { gte: rangeStart(RANGE_DAYS[data.range]) },
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
    ),
  );

/**
 * UTC date string `days` ago, matching the `date` column the job writes.
 */
function rangeStart(days: number) {
  return subDays(new Date(), days).toISOString().slice(0, 10);
}
