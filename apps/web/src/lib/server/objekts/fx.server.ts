import { db } from "@/lib/server/db";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { fxRates } from "@apollo/database/web/schema";

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
