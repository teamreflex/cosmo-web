import { afterAll, beforeAll, expect, test } from "bun:test";
import { ConfigProvider, Effect, Layer } from "effect";
import { TokenVerifier } from "../src/auth";
import { ChatConfig } from "../src/config";
import {
  AUDIENCE,
  ISSUER,
  makeSigner,
  mint,
  ORIGIN,
  outcome,
  type Signer,
} from "./harness";

/**
 * TokenVerifier.layerRemote against a real JWKS over http on a random port,
 * as production fetches the web app's over the private network. Effect only
 * accepts an http key-set URL through the root `patches/effect@*.patch`, so
 * this fails at layer build if a version bump drops the patch. Real time, so
 * tokens are minted now.
 */

let signer: Signer;
let server: ReturnType<typeof Bun.serve>;
beforeAll(async () => {
  signer = await makeSigner();
  server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/auth/jwks") {
        return Response.json({ keys: [signer.publicJwk] });
      }
      if (pathname === "/redirect") {
        return Response.redirect("/api/auth/jwks", 302);
      }
      return new Response(null, { status: 404 });
    },
  });
});
afterAll(() => server.stop(true));

// what verifying a fresh token against the key set at `path` ends as
async function verify(path: string) {
  const token = await mint(signer, { sub: "alice", iat: Date.now() });
  const config = ConfigProvider.fromUnknown({
    AUTH_JWKS_URL: new URL(path, server.url).href,
    AUTH_ISSUER: ISSUER,
    AUTH_AUDIENCE: AUDIENCE,
    ALLOWED_ORIGINS: ORIGIN,
  });
  return Effect.gen(function* () {
    const verifier = yield* TokenVerifier;
    return yield* outcome(verifier.verify(token));
  }).pipe(
    Effect.provide(
      TokenVerifier.layerRemote.pipe(
        Layer.provide(ChatConfig.layer),
        Layer.provide(ConfigProvider.layer(config)),
      ),
    ),
    Effect.runPromise,
  );
}

test("a token verifies against the key set over http", async () => {
  expect(await verify("/api/auth/jwks")).toBe("ok");
});

test("a redirected key set is ChatUnavailable", async () => {
  expect(await verify("/redirect")).toBe("ChatUnavailable");
});
