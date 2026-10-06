import { db } from "@/lib/server/db";
import { ExpectedError } from "@/lib/universal/errors/expected";
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

/**
 * Every currency with a rate row, sorted by code.
 */
export async function fetchFxCurrencies() {
  const rows = await db
    .selectDistinct({ currency: fxRates.currency })
    .from(fxRates)
    .orderBy(fxRates.currency);

  return rows.map((r) => r.currency);
}

/**
 * Rejects currency codes that can't be converted, so every stored price and
 * viewer setting has a rate behind it.
 */
export async function assertSupportedCurrency(currency: string) {
  const row = await db.query.fxRates.findFirst({
    where: { currency },
    columns: { currency: true },
  });

  if (!row) {
    throw new ExpectedError("unsupported_currency");
  }
}
