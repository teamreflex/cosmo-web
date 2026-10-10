import { db } from "@/lib/server/db";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { DEFAULT_CURRENCY } from "@/lib/universal/schema/currency";
import { fxRates } from "@apollo/database/web/schema";
import { eq, sql } from "drizzle-orm";

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
 * Every currency with a rate on the newest date, sorted by code. A code missing
 * from that date has no current rate, so it isn't offered even if older dates
 * have it.
 */
export async function fetchFxCurrencies() {
  return (
    await db
      .select({ currency: fxRates.currency })
      .from(fxRates)
      .where(
        eq(fxRates.date, sql`(select max(${fxRates.date}) from ${fxRates})`),
      )
      .orderBy(fxRates.currency)
  ).map((r) => r.currency);
}

/**
 * Rejects currency codes with no rate on the newest date, so every stored
 * price and viewer setting has a rate behind it. USD is the base of every rate, so it
 * passes even when `fx_rates` is empty.
 */
export async function assertSupportedCurrency(currency: string) {
  if (currency === DEFAULT_CURRENCY) {
    return;
  }

  const row = await db.query.fxRates.findFirst({
    where: {
      currency,
      RAW: (t) => sql`${t.date} = (select max(${t.date}) from ${fxRates})`,
    },
    columns: { currency: true },
  });

  if (!row) {
    throw new ExpectedError("unsupported_currency");
  }
}
