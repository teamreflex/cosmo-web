# `apps/archive`

Record/replay proxy for the Subsquid gateway and Abstract RPC. The user-facing summary lives in `README.md`; this file documents non-obvious rules, design decisions, and pitfalls so future changes don't regress them.

## Stack

- Bun + Effect-TS + `@effect/platform-bun`
- Drizzle ORM via `drizzle-orm/bun-sql`, `bun:sql` driver
- Dedicated Postgres (`postgres-archive` in compose, port 5436) — do not reuse `postgres-indexer`. Different lifecycles: archive is the long-lived system of record, indexer DB is throwaway sync state.

## Effect conventions used here

- `Effect.Service` for every dependency-injected unit (`Env`, `Database`, `Recorder`, `Proxy`, `Replay`). `dependencies: [...]` declares what each service needs at construction; consumers `yield* Service` inside their own constructors.
- `Effect.fn("Name")(function* (args) { ... })` for handlers that take arguments. **No-arg handlers stay as plain `Effect.gen` values** (e.g. `handleHeight`, `handleRpc`) — wrapping them in `Effect.fn` adds noise without benefit. Mirror this when adding new handlers.
- `Layer.provideMerge` in `main.ts` so `Env`, `FetchHttpClient`, and `FetchInitLayer` are visible to both downstream services and the server. The split `ServerLayer` / `ServicesLayer` exists because `BunHttpServer.layer({ port })` needs to see `Env` resolved.
- `Data.TaggedError` for typed failures (`MigrationError`, `RecorderError`, `ReplayError`, `InvalidWorkerToken`).
- `Effect.either(...)` instead of try/catch when an Effect can fail. The lint rule will fire if you nest try/catch inside `Effect.gen`.
- The `@effect-expect-leaking HttpServerRequest` JSDoc on `Proxy` and `Replay` suppresses Service-leakage warnings — `HttpServerRequest` is provided per-request by the router, not by a layer.

## Critical quirks

### `decompress: false` is load-bearing

`main.ts` provides `FetchHttpClient.RequestInit` as `{ decompress: false } satisfies BunFetchRequestInit`. Without this, Bun's fetch auto-decompresses gzip responses but we still forward the upstream `Content-Encoding: gzip` header → the indexer SDK double-decompresses → `Z_DATA_ERROR`. Type as `BunFetchRequestInit` (extends `RequestInit` with `decompress`); never use a `as RequestInit` cast.

### Content-Type wins over `setHeader`

`HttpServerResponse.uint8Array(body, { headers })` defaults `Content-Type` to `application/octet-stream` and that default outranks `Content-Type` keys inside the `headers` object. The indexer SDK's `handleResponseBody` checks `Content-Type` to decide whether to JSON-parse — see it as `application/octet-stream` and it returns a Buffer, not parsed JSON. `replay.ts:buildResponse` extracts `content-type` from the recorded headers and passes it via the explicit `contentType:` option. Mirror this whenever returning recorded bytes.

### Body content-type on outbound

`HttpClientRequest.bodyUint8Array(bytes, contentType)` requires the second arg. Pass the inbound `content-type` header (default `application/octet-stream`); upstream returns 415 otherwise.

### Worker tokens are stateless

`encodeWorkerToken(url)` is base64url of the URL. No server-side mapping table. In replay mode the token holds a synthetic `replay://${fromBlock}` URL so we can serve it without an upstream — replay never goes off-host. Don't introduce a token table.

## Canonicalization rules (`src/canonicalize.ts`)

The whole replay scheme rests on this. Two functions: `canonicalize` for gateway worker queries, `canonicalizeRpc` for JSON-RPC.

Both:

- Sort object keys lexicographically.
- Lowercase hex strings matching `/^0x[0-9a-f]+$/i`.
- Sort arrays under known filter keys (`address`, `topic0`–`topic3`, `to`, `sighash`, `traceTypes`).
- Coerce numeric `fromBlock` to string (because the SDK sometimes sends it as a number, sometimes as a string).

Differences:

- `canonicalize` **drops `toBlock`** — chain head differs between record and replay runs; only `fromBlock` + filters identify the query.
- `canonicalizeRpc` drops `id` and `jsonrpc` — those are per-call envelope fields, not part of the request identity.

If you add a new filter array key (the SDK introduces a new selector), add it to `FILTER_ARRAY_KEYS`. If you add a new envelope/non-identity field, drop it.

## Recording vs replay routing

`router.ts` is mode-aware: when `MODE=record` the routes call `Proxy` handlers; when `MODE=replay` they call `Replay` handlers. There's no per-request fallback unless `REPLAY_FALLTHROUGH=true`, in which case `Replay.handle*` falls through to `Proxy.handle*` on miss (and records the new interaction).

The recorder is a `Queue.unbounded` drained by a single `forkScoped` fiber so inserts serialize and we don't open a new DB connection per request. `addFinalizer` flushes pending records on shutdown.

## Schema and migrations

- Schema: `src/schema.ts`. Single `interaction` table plus `replay_state` (key/value cache for `latest_height`).
- `bytea` is declared inline via `customType<{ data: Uint8Array }>` — request and response bodies are stored verbatim, gzip framing intact.
- Drizzle config at `drizzle.config.ts`, output at `drizzle/`.
- Migrations apply on boot from `db.ts` via `migrate(db, { migrationsFolder: "./drizzle" })`. The Dockerfile copies `drizzle/` into the runner stage; do not skip that.
- To add a migration: edit `src/schema.ts`, then `cd apps/archive && DB_URL=... bun drizzle-kit generate`, restart the container.

## Adding a new interaction kind

1. Add to the `interactionKind` const tuple in `src/schema.ts`.
2. If it has identity fields worth indexing, add them as nullable columns + an index.
3. In `proxy.ts:extractMeta`, add a branch that pulls those identity fields out of the request/response bytes.
4. Decide canonicalization: if requests are JSON, route through `canonicalize` (gateway-style) or `canonicalizeRpc` (envelope-stripping) inside `proxyOne`.
5. Add a route in `router.ts` for both record and replay branches.
6. Add a replay handler in `replay.ts` mirroring `handleWorkerQuery` / `handleRpc`.

## Files in priority order when changing things

| File                  | Read first when…                                                        |
| --------------------- | ----------------------------------------------------------------------- |
| `src/schema.ts`       | Adding columns, kinds, indexes.                                         |
| `src/canonicalize.ts` | Replay matching breaks; SDK sends a new shape.                          |
| `src/proxy.ts`        | Recording behavior, header forwarding, worker rewriting.                |
| `src/replay.ts`       | Replay misses, response shape mismatches.                               |
| `src/main.ts`         | Layer composition, fetch config, server bootstrap.                      |
| `src/router.ts`       | Mode dispatch, route table.                                             |
| `src/db.ts`           | Connection / migration changes.                                         |
| `Dockerfile`          | Anything that affects what ships to the runner stage (esp. `drizzle/`). |

## What not to do

- Don't add SSRF allowlists or auth — proxy is private-network-only by deployment policy.
- Don't reuse `postgres-indexer`. Long-lived archive vs throwaway sync state.
- Don't decompress upstream bodies in the proxy. Bytes pass through verbatim, gzip framing intact.
