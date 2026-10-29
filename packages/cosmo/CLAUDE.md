# @apollo/cosmo

Rules for changing the COSMO client. The client policy, credential and QR login diagrams are in [`README.md`](README.md).

## Auth per endpoint

| Auth                  | Endpoints                                                                                                                     | Credential                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `bearer(accessToken)` | `fetchArtists`, `fetchArtist`, `fetchAllArtists`, `fetchGravities`, `fetchGravity`, `fetchPoll`, `search`, `fetchUserProfile` | The dummy account's token from `getProxiedToken()` (web) or `ProxiedToken` (schedules) |
| `user-session` cookie | `fetchObjektSummaries`                                                                                                        | The session `certifyTicket` grants during the QR login, never stored                   |
| None                  | `fetchByNickname`, `fetchLiveVote`, `fetchMetadataV3`, `refreshV3`, `exchangeLoginTicket`, `queryTicket`, `certifyTicket`     | -                                                                                      |

## Errors

- `withCosmoErrors` maps `HttpClientError` to `CosmoApiError` and sits outside the retry, because the retry predicate needs the raw error. A new client keeps that order.
- `decodeBody` maps `SchemaError` to `CosmoDecodeError`. Decode every response body with it.
- `fetchUserProfile` maps errors by hand, because it decrypts the body before decoding it.
- `CosmoApiError.status` is undefined when no response arrived.
- Consumers branch on the error but never re-wrap it, e.g. `fetchCachedGravity()` in `apps/web` turns a 404 into `notFound()`. Add context with spans or logs.
- `refreshV3` and `fetchUserProfile` can also fail with `EncryptionError`, a plain `Error` subclass in `src/server/encryption.ts` that `@apollo/cosmo/errors` doesn't export.
- The metadata fetchers can also fail with Effect's `TimeoutError`.

## Retries

- Retry is a one-way client transformation, so a client without it starts from `cosmoApiBase`, as `cosmoNoRetryClient` does.
- Use `cosmoNoRetryClient` where a failure is the answer: `fetchByNickname` reads a 404 as "no such user", `fetchLiveVote` as "no live totals for this poll".
- The metadata fetchers retry for up to 5 minutes, because COSMO has no metadata for the first seconds after a mint and the indexer can't skip a token.
- A UI caller of a metadata fetcher passes the request signal, so a cancelled request stops the retry (`apps/web/src/lib/functions/collections.ts` does).

## Gotchas

- Metadata comes from `fetchMetadataV3`. `normalizeV3` maps it into the v1-shaped `CosmoObjektMetadataV1` and fills the fields v3 lacks with placeholders, listed in [`apps/indexer/CLAUDE.md`](../../apps/indexer/CLAUDE.md).
- `normalizeV3` throws a plain `Error` when a trait is missing.
- The AES key is an argument, never module state, because staff rotate it from the admin cache page. Where callers read it is in the README's Credentials diagram.
- The AES wire format is `base64(iv16 ++ AES-256-CBC ciphertext)`, pinned by `tests/encryption.test.ts`.
- `getRecaptchaToken` is a plain async function, not an Effect: call it with `await`, not `runCosmo`.
- `getRecaptchaToken` connects to a running browser over CDP (`endpoint`, which `apps/web` fills from `CDP_ENDPOINT`) instead of launching one, so locally it needs the `browserless` docker-compose service.
- `certifyTicket` returns `{ status, cookies }`; the session is `cookies["user-session"]`.
- `fetchObjektSummaries` returns at most the newest 30 collections, so pass `seasons` for large classes such as Double.

## Types

- `src/schema/*` is the source of truth for response shapes. `src/types/*` derive from it via `typeof XSchema.Type`; never hand-write a response type.
- The type files import schemas with `import type`, so consumers of the types get no runtime `effect` dependency.
- Arrays are `Schema.mutable(Schema.Array(...))` because the public types use mutable arrays. Object properties stay readonly: build new objects instead of mutating decoded data.
- `validArtists` in `src/types/common.ts` is the canonical artist id list, and `ValidArtistSchema` derives from it.

## Tests

`bun test` runs only `tests/encryption.test.ts`. HTTP functions have no tests by design ([`docs/testing.md`](../../docs/testing.md)), so check endpoint and client changes against the real API.

## Where to start

- New endpoint: a schema in `src/schema/<area>.ts`, its derived type in `src/types/<area>.ts`, and an `Effect.fn("Cosmo.<name>")` in `src/server/<area>.ts`. Pick the client deliberately: api or shop, retry or not.
- Timeouts and retries: `src/server/http.ts`. The 5-minute metadata window is in `src/server/metadata.ts`.
- Token refresh: `getProxiedToken()` in `apps/web/src/lib/server/proxied-token.server.ts` and `ProxiedToken` in `apps/schedules/src/proxied-token.ts` implement the same logic separately; change both.
