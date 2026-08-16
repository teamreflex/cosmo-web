# COSMO Package

Types and API functions for the COSMO app's private APIs. One Effect-native API surface:

- `src/server/` — Effect functions, imported via `@apollo/cosmo/server/*`. HTTP via `@effect/platform` `HttpClient`, responses validated with `Schema` at the boundary. Effect apps (`apps/schedules`) compose these directly into their own runtimes.
- `src/runtime.ts` (`@apollo/cosmo/runtime`) — exports `runCosmo(effect, signal?)`, a module-level `ManagedRuntime` over `FetchHttpClient.layer` for promise-based apps (`apps/web`, `apps/indexer`): `await runCosmo(fetchX(args), signal)`. It uses `runPromiseExit` + `Cause.squash` so the original tagged error instance is thrown rather than a `FiberFailure` wrapper.

Failures are the tagged error classes from `src/errors.ts` (`@apollo/cosmo/errors`): `CosmoApiError` (HTTP, carries `url` and `status`), `CosmoDecodeError` (schema mismatch, carries `url`), plus `EncryptionError` (crypto). Raw `HttpClientError`/`ParseError` never escape the package — mapping happens once in `src/server/http.ts` (`withCosmoErrors` on the clients, applied outside retry so the retry predicate sees raw errors, and the `decodeBody` helper). Consumers should not re-wrap these errors; add context with spans or log messages instead.

## Client policies (`src/server/http.ts`)

- `cosmoClient` / `cosmoShopClient`: 10s timeout, one retry after 300ms on transport errors and [408, 425, 429, 500, 502, 503, 504]. 499 is excluded deliberately so client cancellations don't loop.
- `cosmoNoRetryClient`: for endpoints where failure is meaningful (`fetchByNickname`, where a 404 means "no such user").
- `metadataClient`: mirrors plain-ofetch defaults (no timeout, immediate retry, list includes 409) — the metadata endpoints behaved this way before the Effect rewrite and `apps/indexer` depends on them.

## Quirks preserved on purpose

- `fetchGravity` fails like any other function; the historical swallow-to-`null` is a caller concern (`apps/web` wraps it in `runCosmo(...).catch(() => null)`).
- `refreshV3` AES-encrypts its body (`text/plain` + `x-cosmo-encrypted: 1`); `fetchUserProfile` AES-decrypts the response. Key handling in `src/server/encryption.ts` (pure functions, no Effect).
- `certifyTicket` returns `{ status, cookies }` — callers read the granted `user-session` cookie.
- `getRecaptchaToken` drives a headless browser (puppeteer); it is a plain promise function, not part of the Effect surface — call it with `await`, not `runCosmo`.

## Constraints

- `apps/indexer` typechecks these sources under `moduleResolution: nodenext`: any relative import reachable from `server/metadata.ts` or `runtime.ts` needs an explicit `.js` extension.
- The response schemas in `src/schema/*` are the single source of truth for response shapes. The public types in `src/types/*` derive from them via `typeof XSchema.Type` (type-only imports, so they erase at emit and add no runtime `effect` dependency for consumers) — never hand-sync a schema and a type. `Schema.mutable(Schema.Array(...))` is required because the public types use mutable arrays. Note that derived types have readonly properties — decoded COSMO data is not meant to be mutated in place; build new objects instead.

## Tests

`bun test` runs a characterization suite (`tests/`) against an MSW server (`tests/preload.ts` wires lifecycle via bunfig) that intercepts the real COSMO URLs — no seams in src needed. Tests run effects through `runCosmo` and pin request shapes, response unwrapping, retry counts, error `status` shapes (assert properties, never `instanceof` some HTTP lib's error), and the encryption roundtrips. If you change client policy or endpoint behavior, update these tests deliberately.
