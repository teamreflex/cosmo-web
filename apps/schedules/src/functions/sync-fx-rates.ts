import { DatabaseWeb } from "@/db";
import { Env } from "@/env";
import { fxRates } from "@apollo/database/web/schema";
import { sql } from "drizzle-orm";
import {
  Clock,
  Data,
  Duration,
  Effect,
  Redacted,
  Schedule,
  Schema,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import type { ScheduledTask } from "../task";

const ExchangerateResponse = Schema.Union([
  Schema.Struct({
    result: Schema.Literal("success"),
    conversion_rates: Schema.Record(Schema.String, Schema.Number),
  }),
  Schema.Struct({
    result: Schema.Literal("error"),
    "error-type": Schema.String,
  }),
]);

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
          SchemaError: (cause) =>
            Effect.fail(new FxRatesDecodeError({ cause })),
          // don't wrap the http client error: it carries the request URL,
          // which embeds the API key and would leak into logs
          HttpClientError: (error) =>
            Effect.fail(
              error.response === undefined
                ? new FetchFxRatesError({
                    status: undefined,
                    description: error.reason._tag,
                  })
                : new FetchFxRatesError({
                    status: error.response.status,
                    description: "exchangerate-api responded with an error",
                  }),
            ),
        }),
        Effect.retry({
          schedule: Schedule.exponential(Duration.seconds(1)),
          times: 2,
        }),
      );

    if (json.result !== "success") {
      return yield* new FxRatesApiError({ errorType: json["error-type"] });
    }

    // API returns USD-base: 1 USD = N <currency>. Store the inverse (USD per
    // unit of currency) so the aggregation can multiply rather than divide.
    const today = new Date(yield* Clock.currentTimeMillis)
      .toISOString()
      .slice(0, 10);
    const rows = Object.entries(json.conversion_rates)
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

/**
 * Failed to fetch FX rates from exchangerate-api.com. Deliberately does not
 * carry the underlying platform error — its request URL embeds the API key.
 */
export class FetchFxRatesError extends Data.TaggedError("FetchFxRatesError")<{
  readonly status: number | undefined;
  readonly description: string;
}> {}

/**
 * Failed to decode the FX rates response. ParseError contains no URL, so it
 * is safe to keep as the cause.
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
