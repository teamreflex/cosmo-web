import type { Role } from "@apollo/auth";
import type { ChatItem, JoinItem } from "@apollo/chat/items";
import { ChatAuth, ChatRpcs } from "@apollo/chat/protocol";
import type { TradeOfferStatus } from "@apollo/database/web/types";
import {
  ConfigProvider,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Queue,
  Redacted,
  type Schema,
  type Scope,
  Stream,
} from "effect";
import { Mac, SecureRandom, Signature } from "effect/crypto";
import { Headers } from "effect/http";
import { Jwk, Jwks, Jws } from "effect/jose";
import { RateLimiter } from "effect/persistence";
import { RpcMiddleware, RpcTest } from "effect/rpc";
import { TestClock } from "effect/testing";
import { TokenVerifier } from "../src/auth";
import { MessageCipher } from "../src/cipher";
import { ChatConfig } from "../src/config";
import { ChatServerLayer } from "../src/server";
import { type MemoryState, memoryStoreLayer } from "./memory-store";

/**
 * The in-memory world chat tests run in: the Map store, a local JWKS, a
 * random message key, a memory rate limiter, config from a test provider
 * and the TestClock. Nothing here opens a database, Redis or a socket.
 */

// 2026-10-14T00:00:00Z, where every test starts the TestClock
export const TEST_NOW = Date.UTC(2026, 9, 14);
export const ISSUER = "http://web.test";
export const AUDIENCE = "ws://chat.test";
export const ORIGIN = "http://web.test";

const configLayer = ConfigProvider.layer(
  ConfigProvider.fromUnknown({
    AUTH_JWKS_URL: "http://web.test/api/auth/jwks",
    AUTH_ISSUER: ISSUER,
    AUTH_AUDIENCE: AUDIENCE,
    ALLOWED_ORIGINS: ORIGIN,
  }),
);

const cryptoLayer = Layer.mergeAll(
  Signature.layerWebCrypto,
  Mac.layerWebCrypto,
).pipe(Layer.provide(SecureRandom.layerWebCrypto));

export type Signer = {
  kid: string;
  key: Jwk.PrivateKey;
  publicJwk: Jwk.PublicJwk;
};

// a signing key and the public JWK the JWKS lists for it, as the web app's jwt plugin keeps them
export function makeSigner(): Promise<Signer> {
  const kid = crypto.randomUUID();
  return Effect.gen(function* () {
    const pair = yield* Jwk.generateKeyPair({ algorithm: "EdDSA", kid });
    return {
      kid,
      key: yield* Jwk.importPrivate(pair.privateKey, "EdDSA"),
      publicJwk: pair.publicKey,
    };
  }).pipe(Effect.provide(cryptoLayer), Effect.runPromise);
}

export type Claims = Record<string, Schema.Json | undefined>;

// `claims` as a compact JWS under `key`, with `typ: JWT`; undefined claims are left out
export function sign(key: Jwk.SigningKey, claims: Claims) {
  return Jws.sign(new TextEncoder().encode(JSON.stringify(claims)), key, {
    typ: "JWT",
  }).pipe(
    Effect.map(Redacted.value),
    Effect.provide(cryptoLayer),
    Effect.runPromise,
  );
}

/**
 * Signs a token as the jwt plugin does: EdDSA under the signer's kid, the
 * test issuer and audience, `sub` and `sid`, five minutes from `iat`.
 * `claims` replace or add claims.
 */
export function mint(
  signer: Signer,
  options: { sub: string; sid?: string; iat?: number; claims?: Claims },
) {
  const iat = Math.floor((options.iat ?? TEST_NOW) / 1000);
  return sign(signer.key, {
    sub: options.sub,
    sid: options.sid ?? sessionOf(options.sub),
    iss: ISSUER,
    aud: AUDIENCE,
    iat,
    exp: iat + 300,
    ...options.claims,
  });
}

export function sessionOf(userId: string) {
  return `${userId}-session`;
}

export function addUser(
  state: MemoryState,
  userId: string,
  role: Role = "user",
) {
  state.sessions.set(sessionOf(userId), {
    userId,
    expiresAt: new Date(TEST_NOW + 7 * 24 * 3600 * 1000),
    impersonatedBy: null,
    role,
    banned: false,
    banExpires: null,
  });
}

export function addTrade(
  state: MemoryState,
  trade: {
    id: string;
    status?: TradeOfferStatus;
    from: string | null;
    to: string | null;
  },
) {
  state.trades.set(trade.id, {
    id: trade.id,
    status: trade.status ?? "accepted",
    fromUserId: trade.from,
    toUserId: trade.to,
  });
}

export const TRADE = "11111111-1111-4111-8111-111111111111";
export const OTHER_TRADE = "22222222-2222-4222-8222-222222222222";

/**
 * Alice (from) and Bob (to) trade TRADE; Carol and Dave trade OTHER_TRADE;
 * Mod is a moderator and Admin an admin.
 */
export function seed(state: MemoryState) {
  for (const user of ["alice", "bob", "carol", "dave"]) {
    addUser(state, user);
  }
  addUser(state, "mod", "moderator");
  addUser(state, "admin", "admin");
  addTrade(state, { id: TRADE, from: "alice", to: "bob" });
  addTrade(state, { id: OTHER_TRADE, from: "carol", to: "dave" });
}

export function serverLayer(state: MemoryState, signer: Signer) {
  return ChatServerLayer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        memoryStoreLayer(state),
        MessageCipher.layerTest,
        TokenVerifier.layer.pipe(
          Layer.provide(Jwks.layerLocal({ keys: [signer.publicJwk] })),
        ),
        RateLimiter.layer.pipe(Layer.provide(RateLimiter.layerStoreMemory)),
      ),
    ),
    Layer.provideMerge(ChatConfig.layer),
    Layer.provide(configLayer),
  );
}

/**
 * Runs a test program against the server with the TestClock at TEST_NOW.
 * The clock is set before the server is built, because setting it later
 * would replay every per-minute sweep of the memory rate limiter since the
 * epoch. `around` (a logger, say) is in place before the server is built,
 * so its fibers see it too.
 */
export function run<A, E>(
  state: MemoryState,
  signer: Signer,
  program: Effect.Effect<
    A,
    E,
    Scope.Scope | Layer.Success<ReturnType<typeof serverLayer>>
  >,
  around: Layer.Layer<never> = Layer.empty,
) {
  return Effect.runPromise(
    TestClock.setTime(TEST_NOW).pipe(
      Effect.andThen(
        program.pipe(Effect.scoped, Effect.provide(serverLayer(state, signer))),
      ),
      Effect.provide(Layer.merge(TestClock.layer(), around)),
    ),
  );
}

/**
 * A client whose every call carries `token` (or no authorization header at
 * all when it is null), as the browser's ChatAuth half does.
 */
export function client(token: string | null) {
  return RpcTest.makeClient(ChatRpcs).pipe(Effect.provide(bearer(token)));
}

// ChatAuth's client half, attaching `token` to every call
export function bearer(token: string | null) {
  return RpcMiddleware.layerClient(ChatAuth, ({ request, next }) =>
    next(
      token === null
        ? request
        : {
            ...request,
            headers: Headers.set(
              request.headers,
              "authorization",
              `Bearer ${token}`,
            ),
          },
    ),
  );
}

/**
 * A running stream's items as they arrive, and how it ended.
 */
export function collect<E>(stream: Stream.Stream<JoinItem, E>) {
  return Effect.gen(function* () {
    const items = yield* Queue.unbounded<ChatItem>();
    const fiber = yield* stream.pipe(
      Stream.runForEach((item) =>
        item._tag === "CaughtUp" ? Effect.void : Queue.offer(items, item),
      ),
      Effect.forkScoped,
    );
    return {
      // the next `count` items, waiting for them to arrive
      take: (count: number) =>
        Effect.forEach(Array.from({ length: count }), () => Queue.take(items)),
      // whatever has arrived without waiting
      drain: Queue.clear(items),
      // the error the stream ended with, once it has
      failure: Fiber.await(fiber).pipe(
        Effect.map((exit) =>
          Exit.isFailure(exit)
            ? Option.getOrUndefined(Exit.findErrorOption(exit))
            : undefined,
        ),
      ),
      fiber,
    };
  });
}

// a call's error tag, or "ok"
export function outcome<A, E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<A, E, R>,
) {
  return effect.pipe(
    Effect.as("ok"),
    Effect.catch((error) => Effect.succeed(error._tag)),
  );
}

// lets forked fibers and promise-backed work (Web Crypto) settle
export const settle = Effect.promise(
  () => new Promise((resolve) => setTimeout(resolve, 5)),
);
