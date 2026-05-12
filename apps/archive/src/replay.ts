import { HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { and, desc, eq, sql } from "drizzle-orm";
import { Data, Effect, Option } from "effect";
import { canonicalize, canonicalizeRpc } from "./canonicalize";
import { Database } from "./db";
import { Env } from "./env";
import { Proxy } from "./proxy";
import { interactions, replayState } from "./schema";
import { encodeWorkerToken } from "./url-token";

export class ReplayError extends Data.TaggedError("ReplayError")<{
  cause: unknown;
}> {}

function applyHeaders(
  res: HttpServerResponse.HttpServerResponse,
  headers: ReadonlyArray<readonly [string, string]>,
): HttpServerResponse.HttpServerResponse {
  let acc = res;
  for (const [k, v] of headers) {
    acc = HttpServerResponse.setHeader(acc, k, v);
  }
  return acc;
}

/**
 * @effect-expect-leaking HttpServerRequest
 */
export class Replay extends Effect.Service<Replay>()("app/Replay", {
  effect: Effect.gen(function* () {
    const env = yield* Env;
    const db = yield* Database;
    const proxy = yield* Proxy;

    function externalBase(req: HttpServerRequest.HttpServerRequest): string {
      if (Option.isSome(env.externalBaseUrl)) return env.externalBaseUrl.value;
      try {
        return new URL(req.url).origin;
      } catch {
        return `http://localhost:${env.port}`;
      }
    }

    const lookupByHash = Effect.fn("Replay.lookupByHash")(function* (
      hash: string,
      kind: "worker-query" | "rpc",
    ) {
      const rows = yield* Effect.tryPromise({
        try: () =>
          db
            .select({
              resStatus: interactions.resStatus,
              resStatusText: interactions.resStatusText,
              resHeaders: interactions.resHeaders,
              resBody: interactions.resBody,
            })
            .from(interactions)
            .where(
              and(eq(interactions.reqHash, hash), eq(interactions.kind, kind)),
            )
            .orderBy(desc(interactions.ts))
            .limit(1),
        catch: (cause) => new ReplayError({ cause }),
      });
      return rows[0];
    });

    const handleHeight = Effect.gen(function* () {
      const cached = yield* Effect.tryPromise({
        try: () =>
          db
            .select({ value: replayState.value })
            .from(replayState)
            .where(eq(replayState.key, "latest_height"))
            .limit(1),
        catch: (cause) => new ReplayError({ cause }),
      }).pipe(Effect.map((rows) => rows[0]?.value));

      if (cached !== undefined) {
        return HttpServerResponse.text(cached);
      }

      const fallback = yield* Effect.tryPromise({
        try: () =>
          db
            .select({ height: sql<number>`max(${interactions.height})` })
            .from(interactions)
            .where(eq(interactions.kind, "height")),
        catch: (cause) => new ReplayError({ cause }),
      }).pipe(Effect.map((rows) => rows[0]?.height ?? 0));

      return HttpServerResponse.text(String(fallback));
    });

    const handleWorkerLookup = Effect.fn("Replay.handleWorkerLookup")(
      function* (fromBlock: string) {
        const req = yield* HttpServerRequest.HttpServerRequest;
        // Replay never goes off-host: synthesize a worker URL that points back at us.
        // The token only needs to be unique per fromBlock so the SDK doesn't reuse cached URLs.
        const synthetic = `replay://${fromBlock}`;
        const token = encodeWorkerToken(synthetic);
        return HttpServerResponse.text(`${externalBase(req)}/_worker/${token}`);
      },
    );

    const handleWorkerQuery = Effect.fn("Replay.handleWorkerQuery")(function* (
      token: string,
    ) {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const reqBuffer = yield* req.arrayBuffer.pipe(
        Effect.catchTag("RequestError", () =>
          Effect.succeed(new ArrayBuffer(0)),
        ),
      );
      const reqBytes = new Uint8Array(reqBuffer);
      const { hash } = canonicalize(reqBytes);

      if (hash === null) {
        return HttpServerResponse.text("malformed request body", {
          status: 400,
        });
      }

      const row = yield* lookupByHash(hash, "worker-query");

      if (row !== undefined) {
        return applyHeaders(
          HttpServerResponse.uint8Array(row.resBody, {
            status: row.resStatus,
          }),
          row.resHeaders,
        );
      }

      if (env.replayFallthrough) {
        return yield* proxy.handleWorkerQuery(token);
      }

      return HttpServerResponse.text(`replay miss: ${hash}`, { status: 502 });
    });

    const handleRpc = Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest;
      const reqBuffer = yield* req.arrayBuffer.pipe(
        Effect.catchTag("RequestError", () =>
          Effect.succeed(new ArrayBuffer(0)),
        ),
      );
      const reqBytes = new Uint8Array(reqBuffer);
      const { hash } = canonicalizeRpc(reqBytes);

      if (hash === null) {
        return HttpServerResponse.text("malformed request body", {
          status: 400,
        });
      }

      const row = yield* lookupByHash(hash, "rpc");

      if (row !== undefined) {
        return applyHeaders(
          HttpServerResponse.uint8Array(row.resBody, {
            status: row.resStatus,
          }),
          row.resHeaders,
        );
      }

      if (env.replayFallthrough) {
        return yield* proxy.handleRpc;
      }

      return HttpServerResponse.text(`replay miss: ${hash}`, { status: 502 });
    });

    return {
      handleHeight,
      handleWorkerLookup,
      handleWorkerQuery,
      handleRpc,
    };
  }),
  dependencies: [Env.Default, Database.Default, Proxy.Default],
}) {}
