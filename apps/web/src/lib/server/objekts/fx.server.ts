import { db } from "@/lib/server/db";
import { fxRates } from "@apollo/database/web/schema";
import { desc, inArray } from "drizzle-orm";

/**
 * Latest USD-per-unit rate for each of the given currencies. Currencies with
 * no rate row are absent from the map.
 */
export async function fetchLatestFxRates(currencies: string[]) {
  if (currencies.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .selectDistinctOn([fxRates.currency], {
      currency: fxRates.currency,
      rateToUsd: fxRates.rateToUsd,
    })
    .from(fxRates)
    .where(inArray(fxRates.currency, currencies))
    .orderBy(fxRates.currency, desc(fxRates.date));

  return new Map(rows.map((r) => [r.currency, r.rateToUsd]));
}
