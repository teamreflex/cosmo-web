import { DatabaseWeb } from "@/db";
import { Env } from "@/env";
import { fxRates } from "@apollo/database/web/schema";
import { HttpClient, HttpClientResponse } from "@effect/platform";
import { sql } from "drizzle-orm";
import { Data, Effect, Redacted, Schedule, Schema } from "effect";
import type { ScheduledTask } from "../task";

const ExchangerateResponse = Schema.Union(
  Schema.Struct({
    result: Schema.Literal("success"),
    conversion_rates: Schema.Record({
      key: Schema.String,
      value: Schema.Number,
    }),
  }),
  Schema.Struct({
    result: Schema.Literal("error"),
    "error-type": Schema.String,
  }),
);

/**
 * Fetch USD-base FX rates from exchangerate-api.com and upsert into the
 * `fx_rates` table, keyed by `(date, currency)` so the history is preserved.
 */
export const syncFxRatesTask = {
  name: "sync-fx-rates",
  cron: "0 */12 * * *",
  effect: Effect.gen(function* () {
    const env = yield* Env;
    const db = yield* DatabaseWeb;
    const client = yield* HttpClient.HttpClient;
    const apiKey = Redacted.value(env.exchangerateApiKey);

    const json = yield* client
      .get(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`)
      .pipe(
        Effect.andThen(HttpClientResponse.schemaBodyJson(ExchangerateResponse)),
        Effect.catchTags({
          ParseError: (cause) => Effect.fail(new FxRatesDecodeError({ cause })),
          RequestError: (cause) =>
            Effect.fail(new FetchFxRatesError({ cause })),
          ResponseError: (cause) =>
            Effect.fail(new FetchFxRatesError({ cause })),
        }),
        Effect.scoped,
        Effect.retry(Schedule.recurs(2)),
      );

    if (json.result !== "success") {
      return yield* new FxRatesApiError({ errorType: json["error-type"] });
    }

    // API returns USD-base: 1 USD = N <currency>. Store the inverse (USD per
    // unit of currency) so the aggregation can multiply rather than divide.
    const today = new Date().toISOString().slice(0, 10);
    const rows = Object.entries(json.conversion_rates)
      .filter(([, rate]) => rate > 0)
      .map(([currency, rate]) => ({
        date: today,
        currency,
        rateToUsd: 1 / rate,
      }));

    yield* Effect.tryPromise({
      try: async () => {
        await db
          .insert(fxRates)
          .values(rows)
          .onConflictDoUpdate({
            target: [fxRates.date, fxRates.currency],
            set: {
              rateToUsd: sql`excluded.rate_to_usd`,
              updatedAt: sql`now()`,
            },
          });
      },
      catch: (cause) => new StoreFxRatesError({ cause }),
    });

    yield* Effect.logInfo(`Synced ${rows.length} FX rates for ${today}`);
  }),
} satisfies ScheduledTask;

/**
 * Failed to fetch FX rates from exchangerate-api.com.
 */
export class FetchFxRatesError extends Data.TaggedError("FetchFxRatesError")<{
  readonly cause: unknown;
}> {}

/**
 * Failed to decode the FX rates response.
 */
export class FxRatesDecodeError extends Data.TaggedError("FxRatesDecodeError")<{
  readonly cause: unknown;
}> {}

/**
 * exchangerate-api.com responded with an error payload.
 */
export class FxRatesApiError extends Data.TaggedError("FxRatesApiError")<{
  readonly errorType: string;
}> {}

/**
 * Failed to upsert FX rates into the database.
 */
export class StoreFxRatesError extends Data.TaggedError("StoreFxRatesError")<{
  readonly cause: unknown;
}> {}
