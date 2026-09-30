import { DatabaseWeb } from "@/db";
import { Exchangerate } from "@/exchangerate";
import { fxRates } from "@apollo/database/web/schema";
import { sql } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ScheduledTask } from "../task";

/**
 * Fetch USD-base FX rates from exchangerate-api.com and upsert into the
 * `fx_rates` table, keyed by `(date, currency)` so the history is preserved.
 */
export const syncFxRatesTask = {
  name: "sync-fx-rates",
  cron: "0 */12 * * *",
  effect: Effect.gen(function* () {
    const exchangerate = yield* Exchangerate;
    const db = yield* DatabaseWeb;

    const conversionRates = yield* exchangerate.latestUsdRates;

    // API returns USD-base: 1 USD = N <currency>. Store the inverse (USD per
    // unit of currency) so the aggregation can multiply rather than divide.
    const today = new Date(yield* Clock.currentTimeMillis)
      .toISOString()
      .slice(0, 10);
    const rows = Object.entries(conversionRates)
      .filter(([, rate]) => rate > 0)
      .map(([currency, rate]) => ({
        date: today,
        currency,
        rateToUsd: 1 / rate,
      }));

    yield* db
      .insert(fxRates)
      .values(rows)
      .onConflictDoUpdate({
        target: [fxRates.date, fxRates.currency],
        set: {
          rateToUsd: sql`excluded.rate_to_usd`,
          updatedAt: sql`now()`,
        },
      });

    yield* Effect.logInfo(`Synced ${rows.length} FX rates for ${today}`);
  }),
} satisfies ScheduledTask;
