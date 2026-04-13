import { db } from "@/lib/server/db";

/**
 * Look up the most recent USD-per-unit FX rate for a given currency. Returns
 * null if no rate is available (e.g. unsupported currency or fx_rates not yet
 * populated).
 */
export async function fetchLatestFxRate(
  currency: string,
): Promise<number | null> {
  const row = await db.query.fxRates.findFirst({
    where: { currency },
    columns: { rateToUsd: true },
    orderBy: { date: "desc" },
  });

  return row?.rateToUsd ?? null;
}
