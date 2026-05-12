import { Config, Effect } from "effect";

export class Env extends Effect.Service<Env>()("app/Env", {
  effect: Effect.gen(function* () {
    const port = yield* Config.number("PORT").pipe(Config.withDefault(4350));
    const mode = yield* Config.literal(
      "record",
      "replay",
    )("MODE").pipe(Config.withDefault("record" as const));
    const upstreamUrl = yield* Config.url("UPSTREAM_URL");
    const upstreamRpcUrl = yield* Config.url("UPSTREAM_RPC_URL");
    const dbUrl = yield* Config.redacted("DB_URL");
    const externalBaseUrl = yield* Config.string("EXTERNAL_BASE_URL").pipe(
      Config.option,
    );
    const replayFallthrough = yield* Config.boolean("REPLAY_FALLTHROUGH").pipe(
      Config.withDefault(false),
    );
    const recordBodyLimitBytes = yield* Config.number(
      "RECORD_BODY_LIMIT_BYTES",
    ).pipe(Config.withDefault(67108864));

    return {
      port,
      mode,
      upstreamUrl,
      upstreamRpcUrl,
      dbUrl,
      externalBaseUrl,
      replayFallthrough,
      recordBodyLimitBytes,
    };
  }),
  dependencies: [],
}) {}
