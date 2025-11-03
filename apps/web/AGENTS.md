## Development

- `turbo i18n` - Compile Paraglide JS i18n messages

## Database

- `turbo db:generate` - Generate migration files

The project contains three Postgres database connections:

- `import { db } from "@/lib/server/db"`
  - general Neon Postgres HTTP connection for entities: cosmoAccounts, lockedObjekts, objektLists, objektListEntries, objektMetadata, pins, cosmoTokens, gravities, gravityPolls, gravityPollCandidates, polygonVotes, user, session, acocunt, verification
- `import { dbi } from "@/lib/server/db/interactive"`
  - same Neon Postgres connection but over websockets. only use this when needing to use transactions.
- `import { indexer } from "@/lib/server/db/indexer"`
  - Postgres connection for querying the blockchain indexer for objekt data.
  - entities are: collections, objekts, transfers, comoBalances, votes

When fetching from the database, if the query is simple, use the relational API v2:

```ts
const profile = await db.query.cosmoAccounts.findFirst({
  where: {
    username: "username",
  },
  with: {
    lists: true,
  },
});
```

Otherwise, use the query builder:

```ts
const cosmo = await db
  .select()
  .from(cosmoAccounts)
  .leftJoin(objektLists, eq(profiles.userId, lists.userId))
  .where(eq(cosmoAccounts.username, "username"));
```

## Frontend

The project uses Tailwind v4, so always use v4 conventions rather than v3. This includes things like supporting inline CSS variable usage such as `bg-(--my-var)` vs. `bg-[var(--my-var)]`.

## Architecture Overview

### Tech Stack

- Framework: TanStack Start (Router + Query)
- UI: React 19, Tailwind v4, shadcn/ui components
- Database:
  - Neon PostgreSQL (main app database)
  - Blockchain indexer database (objekts, transfers, votes)
  - Drizzle ORM with relational queries
- Authentication: Better Auth with Discord/Twitter OAuth
- Search: Typesense for fuzzy objekt metadata search
- i18n: Paraglide JS

### Project Structure

- `src/routes/` - TanStack Router pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Core business logic
  - `env/` - Environment variables for per client/server environment
  - `client/` - Client-only utilities
  - `server/` - Server-side logic (database, API calls)
  - `universal/` - Shared types and Zod schemas
  - `queries/` - Server functions and associated TanStack Query options
- `src/hooks/` - Custom React hooks
- `src/i18n/` - Paraglide JS translation strings
- `drizzle/` - Database migrations

### Architecture Patterns

1. **Data Fetching**: Route loaders with server functions, prefetched into query cache as appropriate
2. **Database Access**: Three separate connections:
   - `db` - Main Neon database (HTTP)
   - `dbi` - Interactive Neon connection (WebSocket for transactions)
   - `indexer` - Blockchain indexer database
3. **Error Handling**: Consistent use of Error Boundaries with Suspense
4. **URL State**: Type-safe with TanStack Router search params parsing per route
