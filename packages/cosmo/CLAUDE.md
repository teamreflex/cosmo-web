# COSMO Package

Types and API functions for the COSMO app's private APIs. Consumed by three apps with different runtimes, so it ships two API surfaces over one core:

- `src/effect/` — Effect-native implementations. HTTP via `@effect/platform` `HttpClient`, responses validated with `Schema` at the boundary. Import via `@apollo/cosmo/effect/*` (used by Effect apps like `apps/schedules`).
- `src/server/` — Promise facades with the historical signatures (including trailing `AbortSignal` params), used by `apps/web` and `apps/indexer`. Each facade delegates to the Effect version through `runCosmo` (`src/server/runtime.ts`).

Both surfaces fail with the same tagged error classes from `src/errors.ts` (`@apollo/cosmo/errors`): `CosmoApiError` (HTTP, carries `url` and `status`), `CosmoDecodeError` (schema mismatch, carries `url`), plus `EncryptionError` (crypto). Raw `HttpClientError`/`ParseError` never escape the package — mapping happens once in `src/effect/http.ts` (`withCosmoErrors` on the clients, applied outside retry so the retry predicate sees raw errors, and the `decodeBody` helper). Consumers should not re-wrap these errors; add context with spans or log messages instead.

## Client policies (`src/effect/http.ts`)

- `cosmoClient` / `cosmoShopClient`: 10s timeout, one retry after 300ms on transport errors and [408, 425, 429, 500, 502, 503, 504]. 499 is excluded deliberately so client cancellations don't loop.
- `cosmoNoRetryClient`: for endpoints where failure is meaningful (`fetchByNickname`, where a 404 means "no such user").
- `metadataClient`: mirrors plain-ofetch defaults (no timeout, immediate retry, list includes 409) — the metadata endpoints behaved this way before the Effect rewrite and `apps/indexer` depends on them.

## Quirks preserved on purpose

- `fetchGravity` swallows all errors to `null` (facade level).
- `refreshV3` AES-encrypts its body (`text/plain` + `x-cosmo-encrypted: 1`); `fetchUserProfile` AES-decrypts the response. Key handling in `src/server/encryption.ts` (pure functions, no Effect).
- `certifyTicket` returns `{ status, cookies }` — callers read the granted `user-session` cookie.
- `getRecaptchaToken` drives a headless browser (puppeteer); it is not part of the Effect surface.

## Constraints

- `apps/indexer` typechecks these sources under `moduleResolution: nodenext`: any relative import reachable from `server/metadata.ts` needs an explicit `.js` extension.
- Schemas must stay aligned with the hand-written types in `src/types/` — they are checked structurally wherever a facade declares a return type. `Schema.mutable(Schema.Array(...))` is required because the public types use mutable arrays.

## Tests

`bun test` runs a characterization suite (`tests/`) against an MSW server (`tests/preload.ts` wires lifecycle via bunfig) that intercepts the real COSMO URLs — no seams in src needed. It pins request shapes, response unwrapping, retry counts, error `status` shapes (assert properties, never `instanceof` some HTTP lib's error), and the encryption roundtrips. If you change client policy or endpoint behavior, update these tests deliberately.
