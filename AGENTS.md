## Development

- `pnpm dev` - Start development server with Turbopack
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm format` - Run Prettier formatting

## Database

- `pnpm db:generate` - Generate migration files
- `pnpm db:migrate` - Run migrations
- `pnpm auth:generate` - Generate Better Auth schema

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

- **Framework**: TanStack Start (Router + Query)
- **UI**: React 19, Tailwind v4, shadcn/ui components
- **Database**:
  - Neon PostgreSQL (main app database)
  - Blockchain indexer database (objekts, transfers, votes)
  - Drizzle ORM with relational queries
- **Authentication**: Better Auth with Discord/Twitter OAuth
- **Search**: Typesense for fuzzy objekt metadata search

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
- `drizzle/` - Database migrations

### Key Architecture Patterns

1. **Data Fetching**: Route loaders with server functions, prefetched into query cache as appropriate
2. **Database Access**: Three separate connections:
   - `db` - Main Neon database (HTTP)
   - `dbi` - Interactive Neon connection (WebSocket for transactions)
   - `indexer` - Blockchain indexer database
3. **Error Handling**: Consistent use of Error Boundaries with Suspense
4. **URL State**: Type-safe with TanStack Router search params parsing per route

## Project Context

This is a blockchain explorer for MODHAUS' Cosmo app objekts and gravities. The platform tracks digital collectibles (objekts) and voting systems (gravities) on the blockchain.

A `collection` represents a type of objekt. Certain properties on a collection are:

- the group it belongs to, ie; tripleS, ARTMS
- the member it is, ie: Seoyeon, Heejin
- the season it is part of, ie: Atom01, Binary01, Cream01
- the class of objekt, ie: First, Double, Special, Premier, Welcome
- the number, ie: 101Z, 201Z, 320Z, 401A
  - the suffix is one of two letters: Z or A. Z denotes it's a digital only objekt, A denotes it's a physical objekt
  - the first number can inform the class: 1 is either Welcome or First class, 2 is Special class, 3 is Double class, 4 is Premier class
  - Welcome class objekts are always 100Z

An `objekt` is a singular NFT on the Abstract blockchain. Every objekt within a unique collection has a unique serial number

A `grid` is when a user collects all 8 (or 4) First class objekts for a member, segmented by season and then further segmented by edition.

- 1st edition corresponds to First class collection numbers 101 through 108 and Special class collection numbers 201 & 202
- 2nd edition corresponds to First class collection numbers 109 through 116 and Special class collection numbers 203 & 204
- 3rd edition corresponds to First class collection numbers 117 though 120 and Special class collection numbers 205 & 206
- Completing a grid locks the selected First class objekts to your account, and randomly grants you one of two corresponding Special class objekts
- Completing a grid with physical (designated A) objekts does not grant an A designation Special class, only a Z designation
- Untransferable or unsendable objekts cannot be used to complete a grid
- Exceptions to this rule are as follows:
  - tripleS Atom01 2nd edition Special class objekts were designated as 216 & 217
  - tripleS Atom01 3rd edition Special class objekts were designated as 218 & 219
