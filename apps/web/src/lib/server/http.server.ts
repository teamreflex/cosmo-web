import { env } from "@/lib/env/server";
import {
  Cause,
  Data,
  Duration,
  Effect,
  Exit,
  ManagedRuntime,
  Schedule,
  Schema,
} from "effect";
import {
  FetchHttpClient,
  HttpBody,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";

/**
 * The RPC transport failed, or it returned an error status or error payload.
 */
export class AbstractApiError extends Data.TaggedError("AbstractApiError")<{
  readonly status?: number;
  readonly description?: string;
  readonly cause?: unknown;
}> {}

/**
 * The RPC response didn't match the JSON-RPC envelope.
 */
export class AbstractDecodeError extends Data.TaggedError(
  "AbstractDecodeError",
)<{
  readonly cause: unknown;
}> {}

// a JSON-RPC response carries exactly one of result or error
const RpcResponseSchema = Schema.Union([
  Schema.Struct({ result: Schema.String }),
  Schema.Struct({
    error: Schema.Struct({ code: Schema.Number, message: Schema.String }),
  }),
]);

// exclude 499/aborted so client cancellations don't loop
const retryStatusCodes = [408, 425, 429, 500, 502, 503, 504];

/**
 * Client for the Abstract RPC: 5s timeout, one retry with a 300ms delay on
 * transient failures and the retryable status codes.
 */
const abstractClient = Effect.map(HttpClient.HttpClient, (client) =>
  client.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(env.ABSTRACT_RPC)),
    (client) =>
      HttpClient.transform(client, (effect, request) =>
        Effect.timeoutOrElse(effect, {
          duration: Duration.seconds(5),
          orElse: () =>
            Effect.fail(
              new HttpClientError.HttpClientError({
                reason: new HttpClientError.TransportError({
                  request,
                  description: "request timed out",
                }),
              }),
            ),
        }),
      ),
    HttpClient.filterStatusOk,
    (client) =>
      HttpClient.retry(client, {
        times: 1,
        schedule: Schedule.spaced(Duration.millis(300)),
        while: (error) =>
          error.reason._tag === "TransportError" ||
          (error.response !== undefined &&
            retryStatusCodes.includes(error.response.status)),
      }),
  ),
);

/**
 * Fetch the current block height via eth_blockNumber.
 */
export const fetchBlockNumber = Effect.fn("Abstract.blockNumber")(function* () {
  const client = yield* abstractClient;
  const response = yield* client
    .post("/", {
      body: HttpBody.jsonUnsafe({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
      }),
    })
    .pipe(
      Effect.mapError(
        (error) =>
          new AbstractApiError({
            status: error.response?.status,
            cause: error,
          }),
      ),
    );

  const decoded = yield* HttpClientResponse.schemaBodyJson(RpcResponseSchema)(
    response,
  ).pipe(
    Effect.mapError((error) =>
      error._tag === "SchemaError"
        ? new AbstractDecodeError({ cause: error })
        : new AbstractApiError({ cause: error }),
    ),
  );

  if ("error" in decoded) {
    return yield* new AbstractApiError({
      description: `RPC error ${decoded.error.code}: ${decoded.error.message}`,
    });
  }

  // eth_blockNumber returns a hex string
  return parseInt(decoded.result, 16);
});

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

/**
 * Run an Abstract RPC effect as a promise. Failures are the tagged errors
 * above; runPromiseExit is used so the original error instance is thrown
 * rather than a FiberFailure wrapper.
 */
export async function runAbstract<A, E>(
  effect: Effect.Effect<A, E, HttpClient.HttpClient>,
  signal: AbortSignal | null = null,
): Promise<A> {
  const exit = await runtime.runPromiseExit(effect, {
    signal: signal ?? undefined,
  });
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const error = Cause.squash(exit.cause);
  throw error instanceof Error ? error : new Error(String(error));
}
