import { Config, Context, Data, Duration, Effect, Layer, Schema } from "effect";
import {
  FetchHttpClient,
  HttpBody,
  HttpClient,
  HttpClientResponse,
} from "effect/http";

// a JSON-RPC response carries exactly one of result or error
const BlockResponse = Schema.Union([
  Schema.Struct({ result: Schema.Struct({ timestamp: Schema.String }) }),
  Schema.Struct({
    error: Schema.Struct({ code: Schema.Number, message: Schema.String }),
  }),
]);

export class Abstract extends Context.Service<Abstract>()("app/Abstract", {
  make: Effect.gen(function* () {
    const rpcUrl = yield* Config.String("ABSTRACT_RPC");
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
    );

    /**
     * The timestamp of a block, through eth_getBlockByNumber.
     */
    const blockTimestamp = Effect.fn("Abstract.blockTimestamp")(function* (
      height: number,
    ) {
      const response = yield* client
        .post(rpcUrl, {
          body: HttpBody.jsonUnsafe({
            id: 1,
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: [`0x${height.toString(16)}`, false],
          }),
        })
        .pipe(
          Effect.andThen(HttpClientResponse.schemaBodyJson(BlockResponse)),
          Effect.timeoutOrElse({
            duration: Duration.seconds(5),
            orElse: () =>
              Effect.fail(new AbstractRpcError({ description: "timed out" })),
          }),
          Effect.catchTags({
            SchemaError: (cause) =>
              Effect.fail(
                new AbstractRpcError({ description: "bad response", cause }),
              ),
            HttpClientError: (cause) =>
              Effect.fail(
                new AbstractRpcError({ description: cause.reason._tag, cause }),
              ),
          }),
        );

      if ("error" in response) {
        return yield* new AbstractRpcError({
          description: `RPC error ${response.error.code}: ${response.error.message}`,
        });
      }

      // block timestamps are hex-encoded unix seconds
      return new Date(parseInt(response.result.timestamp, 16) * 1000);
    });

    return { blockTimestamp };
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(FetchHttpClient.layer),
  );
}

/**
 * The Abstract RPC timed out, failed, or answered with an error or a body
 * that isn't a block.
 */
export class AbstractRpcError extends Data.TaggedError("AbstractRpcError")<{
  readonly description: string;
  readonly cause?: unknown;
}> {}
