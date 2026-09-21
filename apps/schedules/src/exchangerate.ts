import {
  Config,
  Context,
  Data,
  Duration,
  Effect,
  Layer,
  Redacted,
  Schedule,
  Schema,
} from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse,
} from "effect/unstable/http";

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

export class Exchangerate extends Context.Service<Exchangerate>()(
  "app/Exchangerate",
  {
    make: Effect.gen(function* () {
      const apiKey = yield* Config.Redacted("EXCHANGERATE_API_KEY");
      const client = yield* HttpClient.HttpClient;

      /**
       * Latest USD-base rates from exchangerate-api.com: 1 USD = N <currency>.
       */
      const latestUsdRates = client
        .get(
          `https://v6.exchangerate-api.com/v6/${Redacted.value(apiKey)}/latest/USD`,
        )
        .pipe(
          Effect.andThen(
            HttpClientResponse.schemaBodyJson(ExchangerateResponse),
          ),
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
          Effect.flatMap((json) =>
            json.result === "success"
              ? Effect.succeed(json.conversion_rates)
              : Effect.fail(
                  new FxRatesApiError({ errorType: json["error-type"] }),
                ),
          ),
        );

      return { latestUsdRates };
    }),
  },
) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(FetchHttpClient.layer),
  );
}

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
