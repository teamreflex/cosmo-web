# @apollo/cosmo

Typed client for COSMO's private APIs at `api.cosmo.fans` and the webshop at `shop.cosmo.fans`. Each endpoint is an Effect that validates the response against a `Schema`. Rules for changing the package are in [`CLAUDE.md`](CLAUDE.md).

| Entry                    | Contents                                                                   |
| ------------------------ | -------------------------------------------------------------------------- |
| `@apollo/cosmo/server/*` | One Effect per endpoint, grouped by area (`artists`, `gravity`, `user`, …) |
| `@apollo/cosmo/schema/*` | Response `Schema`s, the source of truth for response shapes                |
| `@apollo/cosmo/types/*`  | Public types derived from the schemas, plus a few hand-written helpers     |
| `@apollo/cosmo/runtime`  | `runCosmo(effect, signal?)` for callers without an Effect runtime          |
| `@apollo/cosmo/errors`   | `CosmoApiError` and `CosmoDecodeError`                                     |
| `@apollo/cosmo/bands`    | Hardcoded band image URLs per artist and class                             |

`apps/web` and `apps/indexer` run the Effects through `runCosmo`. `apps/schedules` yields them inside its own runtime. `packages/trades` and `packages/database` import only from `types/*`.

## Client policies

Every endpoint goes through one of four clients in `src/server/http.ts`. The two policies that differ:

```
cosmoClient                                metadataClient
  api.cosmo.fans + apollo user-agent         api.cosmo.fans, no user-agent
    |                                          |
    v                                          |  no client timeout
  10s timeout -> TransportError                |
    |                                          |
    v                                          v
  filterStatusOk (non-2xx fails)             filterStatusOk
    |                                          |
    v                                          v
  retry once after 300ms on                  retry once, no delay, on
  TransportError, 408 425 429 5xx            TransportError, 408 409 425 429 5xx
    |                                          |
    v                                          v
  withCosmoErrors: HttpClientError -> CosmoApiError
    |                                          |
    v                                          v
  decodeBody: SchemaError -> CosmoDecodeError
                                               |
                                               v
                                   withMetadataRetry (src/server/metadata.ts)
                                   30s per attempt, backoff 1s 2s 4s .. 30s,
                                   up to 5 min, CosmoDecodeError not retried
```

- 5xx means 500, 502, 503 and 504. 499 is never retried, so client cancellations don't loop.
- `cosmoShopClient` has `cosmoClient`'s policy against `shop.cosmo.fans`, plus the `host` and `origin` headers the shop expects.
- `cosmoNoRetryClient` is `cosmoClient` without the retry.

## Credentials

```
cosmo_tokens table (the dummy account, newest row wins)
    |
    v
getProxiedToken() in apps/web  /  ProxiedToken in apps/schedules
    |  access token unexpired -> use it
    |  else refreshV3(refreshToken, key) and insert the new pair as a new row
    |  key = Redis "cosmo-key" (cosmoKeyCacheKey), falling back to COSMO_KEY
    v
Bearer access token -> artists, gravities, polls, user search, fetchUserProfile
```

A refresh token that has expired too means the dummy account needs a fresh login. The QR login below is the only flow that uses a user's own COSMO session.

## Share-data QR login

A signed-in user lends their COSMO session once so Apollo can scrape media that public endpoints don't expose: `frontMedia` for Motion and Double objekts, `bandImageUrl` for Unit objekts. The server functions are in `apps/web/src/lib/functions/share-data.ts`.

```
browser                       web server fns                  browserless    COSMO
  | $fetchQrTicket              | rate limit 5/min/user           |            |
  |---------------------------->| getRecaptchaToken ------------->|            |
  |                             |<----------- reCAPTCHA token ----|            |
  |                             | exchangeLoginTicket ------------------------>| shop
  |<----------- ticket ---------|<------------------------------------ ticket -|
  | shows generateQrCode(ticket); user scans it in the COSMO app, gets an OTP  |
  | $queryQrTicket (polled, 60/min/user) ------------------------------------->| shop
  | $scrapeCollectionMedia(otp, ticket, selection)                             |
  |---------------------------->| certifyTicket ------------------------------>| shop
  |                             |<--------------------- user-session cookie ---|
  |                             | fetchObjektSummaries per query ------------->| api
  |                             | frontMedia copied to R2, bandImageUrl as-is, |
  |                             | both written to the indexer collection row   |
  |<------- { updated } --------| session dropped, never stored                |
```
