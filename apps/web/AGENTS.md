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

### Derived Types

Types that derive from the database are stored alongside the database schemas in the `@apollo/database` package:

```ts
import { type Collection, type Objekt } from "@apollo/database/indexer";
import { type User, type CosmoAccount } from "@apollo/database";
```

These types are automatically inferred from Drizzle schema definitions using `typeof schema.$inferSelect` and `typeof schema.$inferInsert`.

### Relational Query Builder (v2)

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

#### Available Filters

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

#### Examples

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

### Query Builder (for complex queries)

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

## Routing & Data Fetching

The app uses [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview) with [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview) for SSR & server functions and [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) for data fetching/mutation. Refer to official documentation for detailed patterns and APIs.

- Routes are file-based in `src/routes/` using `createFileRoute()`
- Server functions defined with `createServerFn()` in `lib/queries/`
- Query options exported as factories (not hooks) from `lib/queries/`

## Components

### Naming & Organization

- File names use `kebab-case.tsx`
- Organize by domain in `components/{feature}/`
- Shared UI components in `components/ui/` (from shadcn/ui)

### UI Library

The project uses [shadcn/ui](https://ui.shadcn.com/) components built on [Radix UI](https://www.radix-ui.com/) primitives with [Tabler Icons](https://tabler.io/icons).

If you need a component that doesn't exist in the codebase, you can likely add it from the shadcn library. Use the shadcn CLI or copy the component code from their documentation.

### Structure Pattern

```tsx
type Props = {
  // props
};

export default function ComponentName(props: Props) {
  // hooks at top
  // handlers
  return (/* JSX */);
}

// Sub-components below if needed
function SubComponent() {}
```

## Forms

Use `react-hook-form` with `@hookform/resolvers/standard-schema` for Zod validation:

```tsx
import { useForm, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

const form = useForm({
  resolver: standardSchemaResolver(schema),
  defaultValues: {},
});

function handleSubmit(data: z.infer<typeof schema>) {
  mutation.mutate(data, {
    onSuccess: () => toast.success("Success!"),
    onError: (error) => toast.error(error.message),
  });
}

return (
  <form onSubmit={form.handleSubmit(handleSubmit)}>
    <Controller
      control={form.control}
      name="fieldName"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>Label</FieldLabel>
          <Input {...field} />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
    <Button type="submit" disabled={mutation.isPending}>
      Submit
    </Button>
  </form>
);
```

## Tailwind

The project uses Tailwind v4, so always use v4 conventions rather than v3. This includes things like:

- supporting inline CSS variable usage such as `bg-(--my-var)` vs. `bg-[var(--my-var)]`
- using CSS configuration in `styles/tailwind.css` rather than `tailwind.config.js`
- `oklch` colors instead of `hsl`
- Standard shadcn/ui color tokens apply.

### Component Variants

Use [Class Variance Authority (CVA)](https://cva.style/docs) for variant-based components:

```tsx
import { cva } from "class-variance-authority";

const variants = cva({
  base: "base-classes",
  variants: {
    size: {
      sm: "text-sm px-2 py-1",
      md: "text-base px-4 py-2",
      lg: "text-lg px-6 py-3",
    },
    variant: {
      primary: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "primary",
  },
});
```

### Common Patterns

- Combine classes with `cn()` utility from `lib/utils.ts`
- Use data attributes for state: `data-[state=active]:bg-muted`
- Photocard aspect ratio: `aspect-[5.5/8.5]`

## Validation & Types

### Zod Schemas

- Location: `lib/universal/schema/`
- Export both schema and inferred type:

```ts
export const entitySchema = z.object({
  field: z.string(),
  count: z.number(),
});

export type Entity = z.infer<typeof entitySchema>;
```

## Error Handling

### Route-Level Errors

```tsx
export const Route = createFileRoute("/path")({
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
});

function ErrorComponent() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{m.error_something_wrong()}</h2>
        <p className="text-sm text-muted-foreground">
          {m.error_something_wrong_description()}
        </p>
        <Button onClick={() => window.location.reload()}>
          {m.error_reload()}
        </Button>
      </div>
    </div>
  );
}
```

### Component-Level Errors

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary fallback={<ErrorFallback />}>
  <Suspense fallback={<LoadingSkeleton />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>;
```

### Mutation Error Handling

```tsx
mutation.mutate(data, {
  onSuccess: () => {
    toast.success("Success!");
    router.invalidate();
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

## Translations

- when writing new components that include strings, always use the i18n system and create new strings for all languages in `messages/`
- use `turbo i18n` to compile messages into .js modules for use with the `m()` helper.

## Development

When writing throwaway scripts for testing, use the `apps/web/tmp` directory. The contents has been put into `.gitignore` - nothing in here should be committed. Always delete once done.
