# TanStack — Routing, Data Fetching & Server Functions

The app uses [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview) with [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview) for SSR & server functions and [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) for data fetching/mutation. Refer to official documentation for detailed patterns and APIs.

- Routes are file-based in `src/routes/` using `createFileRoute()`
- Server functions defined with `createServerFn()` in `lib/functions/`
- Query options exported as factories (not hooks) from `lib/queries/`

## Server Functions & Import Protection

- `*.server.ts` files are mocked out of client bundles via TanStack Start's import protection.
- Helper functions using `db` / `indexer` / server-only APIs belong in `*.server.ts` companion files in `lib/server/`.
- `createServerFn` files **can** import `*.server.ts` files.
- `createMiddleware` files **cannot** be `*.server.ts` — import protection blocks them (unlike `createServerFn`).
- `export { X } from "./foo.server"` re-exports are blocked — import directly from the source instead.

### When to use `.server.ts` vs `.ts`

- **`.server.ts`** — the file has **no** `createServerFn`/`createMiddleware` exports and contains helpers that touch `db`, `indexer`, `node:crypto`, or other server-only APIs; or it's pure infrastructure (Redis, auth, HTTP helpers).
- **`.ts`** — the file exports `createServerFn` (clients need RPC stubs) or `createMiddleware` (clients need chain resolution), or it's only types / pure functions / constants.

**Companion pattern:** when a `createServerFn` file needs server-only helpers, put them in a `foo.server.ts` next to `foo.ts` and import them from `foo.ts` (TanStack mocks the import on the client). Do not re-export them from `foo.ts` — consumers import directly from `foo.server.ts`.

### Validators

Server-fn input validators use Zod schemas from `lib/universal/schema/`. Export both the schema and its inferred type:

```ts
export const entitySchema = z.object({
  field: z.string(),
  count: z.number(),
});

export type Entity = z.infer<typeof entitySchema>;
```

### Transaction Scoping

When a server fn touches both databases, do indexer-DB reads **before** opening the web-DB transaction; every web-DB read/write in the fn body goes through `tx`:

```ts
const objekts = await indexer.query.objekts.findMany(...); // cross-DB read first
await db.transaction(async (tx) => {
  const existing = await tx.query.objektLists.findFirst(...); // all web-DB access via tx
  await tx.insert(...);
});
```

### Shaping Public Users

Use `toPublicUser` to build `PublicUser` values — it is brand-typed. Don't hand-roll per-field `CASE` masks for socials in SQL.

Load the rows via `db.query.user.findMany(...)` (or `cosmoAccounts` with `with: { user: true }` when you also need the username), then map each through `toPublicUser`. Don't `select` `discord`/`twitter` raw in aggregated CTEs — fetch the user rows in a separate relational query after the aggregation. To build one inline, use a literal with `satisfies PublicUser` (must include `__brand: "PublicUser"`).

## Data Fetching in Loaders

- `await context.queryClient.ensureQueryData(...)` for data the route **needs** to render.
- `void context.queryClient.prefetchQuery(...)` for nice-to-have data that can stream in (e.g. global layout data prefetched in `__root`).

Optional, non-blocking widgets (navbar status, etc.) use `useSuspenseQuery` wrapped in their own `<ErrorBoundary>` + `<Suspense fallback={null}>`, with the query prefetched in the `__root` loader — not a non-suspense `useQuery`. See `system-status` for the canonical shape. An admin/editor page that reads the same value should `ensureQueryData` it in its own route loader and use `useSuspenseQuery` too.

## Invalidation

- `router.invalidate()` (from `useRouter`) after mutations that change SSR loader data — auth/profile changes such as password, email, username, and cosmo link.
- `queryClient.invalidateQueries(...)` for client-only cache refreshes that don't touch the root loader — most admin data mutations.
