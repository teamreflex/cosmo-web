## Architecture

### Tooling

- Framework: TanStack Start (Router + Query)
- UI: React 19, Tailwind v4, shadcn/ui components
- Database: Drizzle ORM + Bun SQL (Postgres), Redis
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
- `src/styles/` - Tailwind and general styling config
- `messages/` - Paraglide JS translation strings
- `drizzle/` - Database migrations

## Database

- `turbo db:generate` - Generate migration files

The project uses Drizzle ORM and the Bun SQL Postgres driver, with two connections:

- `import { db } from "@/lib/server/db"`
  - Postgres connection for general user data
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

For more complex queries such as multiple joins or aggregations, use the query builder:

```ts
const cosmo = await db
  .select()
  .from(cosmoAccounts)
  .leftJoin(objektLists, eq(profiles.userId, lists.userId))
  .where(eq(cosmoAccounts.username, "username"));
```

Do not write raw SQL in `sql` template tags unless absolutely necessary due to the lack of Drizzle function. Things like `array_agg()`, `CASE ... WHEN` statements etc.

## Tailwind

The project uses Tailwind v4, so always use v4 conventions rather than v3. This includes things like:

- supporting inline CSS variable usage such as `bg-(--my-var)` vs. `bg-[var(--my-var)]`
- using CSS configuration in `styles/tailwind.css` rather than `tailwind.config.js`
- `oklch` colors instead of `hsl`

## Translations

- when writing new components that include strings, always use the i18n system and create new strings for all languages in `messages/`
- use `turbo i18n` to compile messages into .js modules for use with the `m()` helper.

## Development

When writing throwaway scripts for testing, use the `apps/web/tmp` directory. The contents has been put into `.gitignore` - nothing in here should be committed. Always delete once done.
