# TanStack: routing, data fetching and server functions

How `apps/web` uses TanStack Start, Router and Query. Library APIs are in their own docs (see [libraries.md](libraries.md)); this file holds the repo's conventions.

## Request path

```
  URL load, or <Link> hover/click (defaultPreload: "intent")
        |
        v
  routes/*.tsx   validateSearch (zod .catch) -> loaderDeps -> context() -> beforeLoad
        |        beforeLoad: throw redirect() or requirePermission() -> notFound()
        |
        |  loader({ context, deps })
        |    await queryClient.query({ ...opts, staleTime: "static" })   needed to render
        |    void queryClient.query(opts).catch(noop)                     streamed
        v
  lib/queries/*.ts     queryOptions, queryFn: ({ signal }) => $fetchX({ signal, data })
        |
        |  in-process during SSR, an HTTP RPC from the browser
        v
  lib/functions/*.ts   createServerFn({ method }).middleware([...]).validator(schema)
        |              .handler: indexer reads, then db.transaction(tx => ...)
        |              helpers from lib/server/*.server.ts, refusals throw ExpectedError
        v
  SSR: setupRouterSsrQueryIntegration dehydrates the cache and streams late queries
        |
        v
  component: useSuspenseQuery(the same options) under <ErrorBoundary><Suspense>
        |
        +-- mutation: useMutation -> $doX (POST) -> onSuccess: invalidate (see below)
```

## Process wiring

| File                    | What it sets up                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/start.ts`          | Sentry request and function middleware, CSRF middleware for server functions only, the `ExpectedError` serialization adapter                                  |
| `src/server.ts`         | The server entry: Paraglide's locale middleware wrapped in Sentry's fetch wrapper                                                                             |
| `src/router.tsx`        | `getRouter()`: the `QueryClient` (default `staleTime` 5 min), router defaults, CSV `stringifySearch`, the CSP nonce, client Sentry, the SSR-query integration |
| `src/routes/__root.tsx` | `staleTime: Infinity`, so its loader reruns only on `router.invalidate()`; prefetches the account, artists, filter data and notice                            |
| `main.ts`               | The production server (`bun run start`, `turbo preview`): static files, `/health`, the per-request CSP                                                        |
| `vite.config.mts`       | Plugin order and the client import-protection deny list; imports both env schemas so a bad env fails the build                                                |

- `defaultPreloadStaleTime: 0` because Query is the caching authority; the router never serves its own cached loader result.
- `handleRedirects: true` lets a `redirect()` thrown inside a query or mutation navigate.
- Vite plugin order: `devtools()` before `tanstackStart()`, because the devtools source-line injection must match between SSR and client or dev hydration fails. `sentryVitePlugin` stays last so it sees the final bundle.
- A new external image, media, script or `connect` origin goes in `buildContentSecurityPolicy()` in `apps/web/main.ts`. Vite dev serves no CSP, so a missing origin only breaks a production build.

## Routes

- File names: `$id` for params, `@{$username}` for the profile prefix, `route.tsx` for a layout. Page-local components (`RouteComponent`, `PendingComponent`, `ErrorComponent`, `NotFoundComponent`) sit at the bottom of the route file. `routes/market/trades.tsx` is a typical route.
- `src/routeTree.gen.ts` is generated; never edit it.
- `validateSearch` uses Zod with `.default().catch()`, so a bad URL falls back instead of erroring. Shared parsers are in `lib/universal/parsers.ts`.
- Filters live in the URL, not component state (`hooks/use-cosmo-filters.ts`). Arrays serialise as CSV (`?member=HeeJin,SeoYeon`) through `stringifySearch()`, and each field's `castToArray()` splits them back.
- `head` uses `defineHead()` from `lib/meta.ts` (title, canonical, `denyRobots`, embeds).
- Per-route `staleTime`: 15 min on public landing and list routes; `Infinity` on admin routes and `gravity/$artist/$id`.
- A loader that calls a server function directly instead of through a query sets `preloadStaleTime` (`routes/list/$id.tsx`), because Query isn't caching the result.
- `ssr: "data-only"` runs the loader on the server and renders the component only on the client (`routes/@{$username}/trades.tsx`, which groups transfers by date on the client).

### Gating

- Signed-out visitors on an account page: `beforeLoad` reads `currentAccountQuery` and throws `redirect({ to: "/" })`.
- Staff pages: `beforeLoad` calls `requirePermission(role, anyOf)` from `hooks/use-has-permission.ts`, and admin routes set `notFoundComponent: AdminNoAccess`.
- Trade system pages: `requireMarketAccess(queryClient)`, which renders the site's root 404.
- Both helpers throw `notFound()`, not an error, because SSR answers a thrown route error with a 500.
- Roles and permissions themselves are in [auth.md](auth.md).

## Loaders

- Data the page needs: `await context.queryClient.query({ ...options, staleTime: "static" })`. It blocks only when nothing is cached, and a failure reaches the route's `errorComponent`.
- Data that can stream in: `void context.queryClient.query(options).catch(noop)`, with `noop` from `@tanstack/react-query`. The SSR-query integration streams it when it resolves.
- Infinite queries use `queryClient.infiniteQuery` the same way.
- `query()` applies the options' `select`, so the loader sees what `useSuspenseQuery` returns.
- `ensureQueryData`, `prefetchQuery` and `fetchQuery` (and their infinite variants) are deprecated, and `typescript/no-deprecated` is a lint error.
- Components read page data with `useSuspenseQuery` / `useSuspenseInfiniteQuery`. Plain `useQuery` is for lookups the user triggers (search comboboxes, QR sign-in), not page data.
- An optional widget (navbar notice, notifications badge) has its query prefetched in a loader and reads it with `useSuspenseQuery` inside `<ErrorBoundary fallback={null}><Suspense fallback={null}>`. `components/navbar/notice.tsx` is the reference.

### Loader and component sync

A prefetch only helps when the component subscribes with exactly the key the loader fetched; any drift re-suspends on the client.

- Build shared `queryOptions` once in the route's `context()` option and read them from the loader's `context` and `useRouteContext()`. `routes/@{$username}/route.tsx` (`targetAccountOptions`) and its `index.tsx` (`pinsOptions`) are the reference.
- `context()` runs before `beforeLoad` and reruns only when params or deps change. It isn't serialized and child routes inherit it, so options holding functions are fine there.
- `loaderDeps` lists only the search params the loader reads, because the loader reruns whenever deps change (`routes/@{$username}/index.tsx` strips `serial`, `locked` and `binder`).
- Key by the route param, not by a value resolved from fetched data, because a profile opened by address resolves to a username and would split the cache. When a key must use resolved data, the component reads that value from loader data.

## Server functions

- Every `createServerFn` lives in `lib/functions/`, is named `$verbNoun`, and is GET for reads and POST for writes.
- Written as `createServerFn({ method }).middleware([...]).validator(schema).handler(...)`. Existing files mix the order of `.middleware` and `.validator`; leave them be.
- Validators are Zod 4. A shared schema lives in `lib/universal/schema/`, exports the schema and its inferred type, and doubles as the form's resolver ([frontend.md](frontend.md#forms)). Small reads use an inline `z.object`.
- Server-only helpers go in a companion `lib/server/<domain>.server.ts` (see [module boundary](#client-and-server-module-boundary)).
- A handler that touches both databases follows [database.md](database.md#crossing-the-databases): indexer reads first, then one `db.transaction`. Helpers called both inside and outside a transaction take `DbOrTx`.
- Users returned to other viewers are shaped with `toPublicUser()`; the rules are in [accounts.md](accounts.md).
- A handler may `throw redirect(...)` after a write (the list functions in `lib/functions/lists.ts`), which `handleRedirects` turns into a navigation.
- Return values are serialized; raw Postgres aggregates arrive as `BigInt` and break that ([database.md](database.md)).

| Middleware (`lib/server/middlewares.ts`) | Adds to `context`                         | Refuses with                        |
| ---------------------------------------- | ----------------------------------------- | ----------------------------------- |
| `authMiddleware`                         | `session`, possibly null                  | nothing                             |
| `authenticatedMiddleware`                | `session`                                 | `not_signed_in`                     |
| `cosmoMiddleware`                        | `session`, `cosmo: { address, username }` | `not_signed_in`, `cosmo_not_linked` |
| `staffMiddleware(permissions)`           | `session`, `role`                         | `not_signed_in`, `forbidden`        |

| Helper                                                               | Use                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `remember(key, ttl, fn, schema?)` in `cache.server.ts`               | Redis cache; with an Effect `Schema`, a cached value that fails to decode counts as a miss |
| `cacheHeaders({ cdn, browser, tags })` in `cache.server.ts`          | `Cache-Control` and `Cache-Tag` for API route responses                                    |
| `consumeRateLimit({ key, limit, window })` in `rate-limit.server.ts` | Throws `ExpectedError("rate_limited")` once the window is spent                            |
| `getRequestSignal()`, `getClientIp()` in `request.server.ts`         | The request's abort signal and the client IP for rate-limit keys                           |

## API routes

- `routes/api/**` are HTTP routes declared with `server: { handlers: { GET } }`.
- They parse params with Zod, return `Response.json`, and set caching through `cacheHeaders()`.
- Partner endpoints authenticate with `verifyRequestApiKey()` ([auth.md](auth.md)).

## Mutations and invalidation

```
  mutation succeeded: what changed?

  +- the signed-in user's own account (username, email, password, socials, link)
  |     -> invalidateQueries({ queryKey: the query holding it })
  |        router.invalidate() as well when a loader returns it directly
  |
  +- who is signed in (email sign-in, sign-out, account deletion)
  |     -> removeViewerQueries(queryClient)
  |        invalidate or zero currentAccountQuery, then router.invalidate()
  |        (OAuth sign-in reloads the page instead)
  |
  +- domain data under a key prefix (tradesKey, tradeListingKey, ["admin", ...])
  |     -> invalidateQueries({ queryKey: prefix }) through a hook that fans out
  |        to every dependent prefix: useInvalidateTrade(), useInvalidateListing()
  |
  +- one cached entity that must update instantly (binder edits)
        -> optimistic, see useBinderMutations() in hooks/use-binder-mutations.ts
           scope: { id }  changes reach the server in order
           onMutate       cancelQueries, snapshot, setQueryData
           onError        restore the snapshot, toast, invalidateQueries
           onSuccess      invalidateQueries, not awaited
```

- `router.invalidate()` reruns loaders, but a loader's `query()` returns cached data unless it is stale. It never refetches a `staleTime: Infinity` or `"static"` query, so invalidate the query itself.
- The optimistic `onSuccess` doesn't await its invalidation, because the next change in the scope would wait on the refetch.
- `removeViewerQueries()` (`lib/queries/core.ts`) removes every query whose answer depends on the viewer although its key doesn't name them. A new query like that goes under one of its prefixes or into the function, because one tab reuses the `QueryClient` across sign-ins.

## Client and server module boundary

Start's import protection replaces `*.server.*` files with mocks in client bundles. Nothing else keeps server code out of the browser.

| Directory                                                                                             | Ships to the browser                      | May import from `lib/server` |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------- |
| `components/`, `hooks/`, `providers/`, route components, `lib/queries`, `lib/client`, `lib/universal` | yes                                       | `import type` only           |
| `lib/functions/*.ts`                                                                                  | an RPC stub; the handler body is stripped | yes                          |
| `lib/server/`, `routes/api/**`                                                                        | no                                        | yes                          |

- A file that exports `createServerFn` or `createMiddleware` is plain `.ts`, never `.server.ts`, because the client needs the RPC stub and the middleware chain. That is why `lib/server/middlewares.ts` has no `.server`.
- Never re-export from a `.server` file (`export { x } from "./foo.server"` is blocked); consumers import from the source.
- `lib/server/db/index.ts`, `lib/server/db/indexer/*` and `middlewares.ts` match no protected pattern. They stay out of the client only because no browser-reachable file imports their values.
- `vite.config.mts` denies `@apollo/image/server` on the client, because it writes to R2 with Bun APIs.
