import { ChatRpcs } from "@apollo/chat/protocol";
import { BunHttpServer } from "@effect/platform-bun";
import { beforeAll, expect, test } from "bun:test";
import { Effect, Layer, Logger, Redacted, type Scope, Stream } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { RpcClient, RpcSerialization } from "effect/rpc";
import { Socket } from "effect/socket";
import { ChatRoutes } from "../src/http";
import {
  bearer,
  makeSigner,
  mint,
  ORIGIN,
  outcome,
  seed,
  serverLayer,
  type Signer,
  TRADE,
} from "./harness";
import { makeState } from "./memory-store";

/**
 * The routes main.ts serves, on a random port, called by a real websocket
 * client: what RpcTest skips, the Origin check, the socket and every value
 * crossing it as JSON. Real time, so tokens are minted now.
 */

let signer: Signer;
beforeAll(async () => {
  signer = await makeSigner();
});

function served() {
  const state = makeState();
  seed(state);
  // seeded sessions expire a week after TEST_NOW, which real time passes
  for (const [id, session] of state.sessions) {
    state.sessions.set(id, {
      ...session,
      expiresAt: new Date(now() + 7 * 24 * 3600 * 1000),
    });
  }
  return HttpRouter.serve(ChatRoutes).pipe(
    Layer.provideMerge(serverLayer(state, signer)),
    Layer.provideMerge(BunHttpServer.layer({ port: 0 })),
  );
}

// a client over its own websocket, opened from `origin` as a browser would
const connect = Effect.fn(function* (token: string, origin = ORIGIN) {
  const { address } = yield* HttpServer.HttpServer;
  if (address._tag === "UnixPathAddress") {
    return yield* Effect.die("the test server listens on a port");
  }
  const protocol = RpcClient.layerProtocolSocket().pipe(
    Layer.provide(Socket.layerWebSocket(`ws://localhost:${address.port}/rpc`)),
    Layer.provide(
      Layer.succeed(Socket.WebSocketConstructor)(
        (url) => new WebSocket(url, { headers: { origin } }),
      ),
    ),
    Layer.provide(RpcSerialization.layerJson),
  );
  // built into the test's scope, so the socket outlives this call
  const context = yield* Layer.build(Layer.merge(protocol, bearer(token)));
  return yield* RpcClient.make(ChatRpcs).pipe(Effect.provideContext(context));
});

const now = () => Date.now();

function run<A, E>(
  program: Effect.Effect<
    A,
    E,
    Scope.Scope | Layer.Success<ReturnType<typeof served>>
  >,
) {
  return Effect.runPromise(
    program.pipe(
      Effect.scoped,
      Effect.provide(served()),
      // the server's request logs would only bury the results
      Effect.provide(Logger.layer([])),
    ),
  );
}

test("a message crosses the socket as text, a date, then CaughtUp", async () => {
  const [alice, bob] = await Promise.all([
    mint(signer, { sub: "alice", iat: now() }),
    mint(signer, { sub: "bob", iat: now() }),
  ]);
  await run(
    Effect.gen(function* () {
      const a = yield* connect(alice);
      const b = yield* connect(bob);
      const { messageId } = yield* a.Send({
        tradeId: TRADE,
        body: Redacted.make("hello over the wire"),
      });

      const [message, caughtUp] = yield* b
        .Join({ tradeId: TRADE })
        .pipe(Stream.take(2), Stream.runCollect);
      expect(message).toMatchObject({
        _tag: "Message",
        id: messageId,
        sender: "from",
      });
      expect(
        message?._tag === "Message" &&
          message.body !== null &&
          Redacted.value(message.body),
      ).toBe("hello over the wire");
      expect(message?._tag === "Message" && message.sentAt).toBeInstanceOf(
        Date,
      );
      expect(caughtUp).toEqual({ _tag: "CaughtUp" });
    }),
  );
});

test("refusals keep their tags across the socket", async () => {
  const [carol, expired] = await Promise.all([
    mint(signer, { sub: "carol", iat: now() }),
    mint(signer, { sub: "alice", iat: now() - 600_000 }),
  ]);
  await run(
    Effect.gen(function* () {
      const outsider = yield* connect(carol);
      expect(
        yield* outcome(
          outsider.Send({ tradeId: TRADE, body: Redacted.make("hi") }),
        ),
      ).toBe("ChatNotFound");

      const stale = yield* connect(expired);
      expect(
        yield* outcome(Stream.runHead(stale.Join({ tradeId: TRADE }))),
      ).toBe("TokenExpired");
    }),
  );
});

test("a socket from another origin is refused", async () => {
  const alice = await mint(signer, { sub: "alice", iat: now() });
  await run(
    Effect.gen(function* () {
      const foreign = yield* connect(alice, "http://evil.test");
      expect(
        yield* outcome(
          foreign.Send({ tradeId: TRADE, body: Redacted.make("hi") }),
        ),
      ).toBe("RpcClientError");
    }),
  );
});
