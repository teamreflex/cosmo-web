import { beforeAll, describe, expect, test } from "bun:test";
import { Effect, Redacted, Stream } from "effect";
import { SignJWT, UnsecuredJWT } from "jose";
import {
  AUDIENCE,
  client,
  ISSUER,
  makeSigner,
  mint,
  outcome,
  run,
  seed,
  sessionOf,
  type Signer,
  TEST_NOW,
  TRADE,
} from "./harness";
import { makeState, type MemoryState } from "./memory-store";

let signer: Signer;
let stranger: Signer;
beforeAll(async () => {
  [signer, stranger] = await Promise.all([makeSigner(), makeSigner()]);
});

function world(change: (state: MemoryState) => void = () => {}) {
  const state = makeState();
  seed(state);
  change(state);
  return state;
}

// what a Send with this token (or none) ends as
function send(state: MemoryState, token: string | null) {
  return run(
    state,
    signer,
    Effect.gen(function* () {
      const chat = yield* client(token);
      return yield* outcome(
        chat.Send({ tradeId: TRADE, body: Redacted.make("hi") }),
      );
    }),
  );
}

const iat = Math.floor(TEST_NOW / 1000);
const claims = (sub: string) => ({
  sub,
  sid: sessionOf(sub),
  iss: ISSUER,
  aud: AUDIENCE,
  iat,
  exp: iat + 300,
});

describe("ChatAuth refuses forged and stale tokens", () => {
  test("a valid token passes", async () => {
    expect(await send(world(), await mint(signer, { sub: "alice" }))).toBe(
      "ok",
    );
  });

  test.each([
    ["no token", async () => null],
    ["garbage", async () => "not-a-jwt"],
    ["alg none", async () => new UnsecuredJWT(claims("alice")).encode()],
    [
      "HS256 signed with the public key as the secret",
      async () =>
        new SignJWT(claims("alice"))
          .setProtectedHeader({ alg: "HS256", kid: signer.kid })
          .sign(new TextEncoder().encode(JSON.stringify(signer.jwks.keys[0]))),
    ],
    [
      "a key the JWKS doesn't list",
      async () => mint(stranger, { sub: "alice" }),
    ],
    [
      "the wrong audience",
      async () =>
        mint(signer, { sub: "alice", claims: { aud: "ws://elsewhere" } }),
    ],
    [
      "the wrong issuer",
      async () =>
        mint(signer, { sub: "alice", claims: { iss: "http://evil.test" } }),
    ],
    [
      "not yet valid",
      async () => mint(signer, { sub: "alice", claims: { nbf: iat + 60 } }),
    ],
    [
      "no session id",
      async () => mint(signer, { sub: "alice", claims: { sid: undefined } }),
    ],
  ])("%s is Unauthorized", async (_label, token) => {
    expect(await send(world(), await token())).toBe("Unauthorized");
  });

  test("an expired token is TokenExpired", async () => {
    const token = await mint(signer, { sub: "alice", iat: TEST_NOW - 301_000 });
    expect(await send(world(), token)).toBe("TokenExpired");
  });

  test("a token naming another user's session is SessionEnded", async () => {
    const token = await mint(signer, { sub: "alice", sid: sessionOf("bob") });
    expect(await send(world(), token)).toBe("SessionEnded");
  });

  test("a token for a signed-out or deleted session is SessionEnded", async () => {
    const token = await mint(signer, { sub: "alice" });
    const state = world((state) => state.sessions.delete(sessionOf("alice")));
    expect(await send(state, token)).toBe("SessionEnded");
  });

  test("a token issued before a ban is Unauthorized", async () => {
    const token = await mint(signer, { sub: "alice" });
    const state = world((state) => {
      const session = state.sessions.get(sessionOf("alice"));
      if (session !== undefined) {
        session.banned = true;
      }
    });
    expect(await send(state, token)).toBe("Unauthorized");
  });

  test("an impersonated session is Unauthorized", async () => {
    const token = await mint(signer, { sub: "alice" });
    const state = world((state) => {
      const session = state.sessions.get(sessionOf("alice"));
      if (session !== undefined) {
        session.impersonatedBy = "admin";
      }
    });
    expect(await send(state, token)).toBe("Unauthorized");
  });

  test("a role claim in the token is ignored; the database role decides", async () => {
    const token = await mint(signer, {
      sub: "carol",
      claims: { role: "admin" },
    });
    const state = world((state) => {
      state.reports.push({
        id: "dispute",
        reporterId: "alice",
        targetType: "trade",
        targetId: TRADE,
        status: "open",
        reason: "not_responding",
        note: null,
      });
    });
    const result = await run(
      state,
      signer,
      Effect.gen(function* () {
        const chat = yield* client(token);
        return yield* outcome(Stream.runHead(chat.Join({ tradeId: TRADE })));
      }),
    );
    expect(result).toBe("ChatNotFound");
  });
});
