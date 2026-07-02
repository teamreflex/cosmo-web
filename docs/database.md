# Database

The project uses Drizzle ORM and the Bun SQL Postgres driver, with two connections:

- `import { db } from "@/lib/server/db"`
  - Postgres connection for general user data
- `import { indexer } from "@/lib/server/db/indexer"`
  - Postgres connection for querying the blockchain indexer for objekt data.
  - entities are: collections, objekts, transfers, comoBalances, votes

`turbo db:generate` generates migration files.

## Derived & Projection Types

Types that derive directly from a Drizzle schema are stored alongside the schemas in the `@apollo/database` package and inferred via `typeof schema.$inferSelect` / `$inferInsert`:

```ts
import { type Collection, type Objekt } from "@apollo/database/indexer";
import { type User, type CosmoAccount } from "@apollo/database";
```

New **projection / joined / UI** types — anything shaped for the app rather than 1:1 with a table — go in `apps/web/src/lib/universal/`, **not** in the database package (`packages/database/src/web/types.ts`).

## Timestamp Columns

Use `mode: "date"`, never `mode: "string"`. `bun:sql` returns `Date` objects; `mode: "string"` emits a zoneless, space-separated string that breaks older Safari and throws on `undefined`. `mode` is a JS-only concern — changing it requires no migration.

## Relational Query Builder (v2)

The project uses Drizzle ORM 1.0.0 with the new relational query builder. For most queries, use the relational API:

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

**IMPORTANT:** The relational query builder uses an **object-based filter syntax**. The old builder function syntax with `and()`, `eq()`, `or()`, etc. **DOES NOT WORK** in the relational query builder. Do not use it.

### Available Filters

The `where` clause accepts an object with the following operators:

```ts
// Top-level operators
where: {
  OR: [],        // Array of filter objects
  AND: [],       // Array of filter objects
  NOT: {},       // Single filter object
  RAW: (table) => sql`${table.id} = 1`,  // Raw SQL escape hatch

  // Filter by relations
  [relation]: {
    // Nested filter object for related table
  },

  // Filter by columns
  [column]: {
    // Logical operators
    OR: [],
    AND: [],
    NOT: {},

    // Comparison operators
    eq: 1,              // equals
    ne: 1,              // not equals
    gt: 1,              // greater than
    gte: 1,             // greater than or equal
    lt: 1,              // less than
    lte: 1,             // less than or equal

    // Array/set operators
    in: [1, 2, 3],      // in array
    notIn: [1, 2, 3],   // not in array

    // String operators
    like: "pattern",    // SQL LIKE
    ilike: "pattern",   // case-insensitive LIKE
    notLike: "pattern",
    notIlike: "pattern",

    // Null operators
    isNull: true,
    isNotNull: true,

    // Array column operators (for PostgreSQL arrays)
    arrayOverlaps: [1, 2],   // overlaps with array
    arrayContained: [1, 2],  // is contained by array
    arrayContains: [1, 2],   // contains array
  },
}
```

### Examples

```ts
// Simple equality (shorthand)
const user = await db.query.users.findFirst({
  where: { id: 1 }, // Shorthand for { id: { eq: 1 } }
});

// Simple equality (explicit)
const user = await db.query.users.findFirst({
  where: { id: { eq: 1 } },
});

// Multiple conditions (implicit AND)
const users = await db.query.users.findMany({
  where: {
    age: { gte: 18 },
    status: { eq: "active" },
  },
});

// OR conditions
const users = await db.query.users.findMany({
  where: {
    OR: [{ age: { lt: 18 } }, { status: { eq: "inactive" } }],
  },
});

// Complex nested conditions
const users = await db.query.users.findMany({
  where: {
    AND: [
      { age: { gte: 18 } },
      {
        OR: [{ status: { eq: "active" } }, { verified: { eq: true } }],
      },
    ],
  },
});

// Filter by relations
// Get users who have at least one published post
const users = await db.query.users.findMany({
  where: {
    posts: {
      published: { eq: true },
    },
  },
  with: {
    posts: true,
  },
});

// Combine main table filter with relation filter
// Get users with id > 10 who have posts starting with 'Hello'
const users = await db.query.users.findMany({
  where: {
    id: { gt: 10 },
    posts: {
      content: { like: "Hello%" },
    },
  },
});

// NOT operator
const users = await db.query.users.findMany({
  where: {
    NOT: {
      status: { eq: "banned" },
    },
  },
});

// String search
const users = await db.query.users.findMany({
  where: {
    username: { ilike: "%search%" },
  },
});

// Array operators (PostgreSQL)
const collections = await db.query.collections.findMany({
  where: {
    tags: { arrayContains: ["featured"] },
  },
});
```

## Query Builder (for complex queries)

For complex queries with multiple joins, aggregations, or custom SQL, use the query builder:

```ts
const cosmo = await db
  .select()
  .from(cosmoAccounts)
  .leftJoin(objektLists, eq(profiles.userId, lists.userId))
  .where(eq(cosmoAccounts.username, "username"));
```

**Note:** In the query builder (not relational), you **DO** use the builder functions like `eq()`, `and()`, `or()`, etc.

Do not write raw SQL in `sql` template tags unless absolutely necessary due to the lack of Drizzle function. Things like `array_agg()`, `CASE ... WHEN` statements etc.

## Migrations

- Put CHECK constraints in the Drizzle **schema**, not in hand-edited SQL.
- Each generated migration file runs in a **single transaction** — split statements that can't share one across separate files. For example, a Postgres enum `ADD VALUE` cannot run in the same transaction as an `UPDATE` that uses the new value.
