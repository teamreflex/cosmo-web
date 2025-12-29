# Typesense Import - Architecture & Patterns

Comprehensive guide to the architecture, patterns, and implementation details of the typesense-import service.

## Architecture Overview

The service follows a functional programming architecture using Effect-TS, structured in three phases:

1. **Setup Phase** - Initializes Typesense resources (API keys, collections, synonyms)
2. **Import Loop** - Continuously polls for new collections and syncs to Typesense
3. **Scheduled Execution** - Runs the import loop at configurable intervals

### Execution Flow

```
main.ts
  ├─ Setup Phase
  │  ├─ setupTypesenseApiKey (creates search-only API key)
  │  ├─ setupTypesenseCollection (defines schema)
  │  └─ setupTypesenseSynonyms (loads member/unit/class aliases)
  │
  └─ Import Loop (scheduled)
     ├─ Query indexer DB for new collections (after last timestamp)
     ├─ Query metadata DB for collection descriptions
     ├─ Transform & enrich data (shortCode, edition)
     └─ Bulk upsert to Typesense (500 items per batch)
```

## Effect-TS Patterns

### Service Pattern

All external dependencies are defined as Effect Services with dependency injection:

```typescript
// Pattern: Effect.Service with factory function
export class ServiceName extends Effect.Service<ServiceName>()("app/ServiceName", {
  effect: Effect.gen(function* () {
    const config = yield* getConfig;
    // Initialize and return service instance
    return serviceInstance;
  }),
  dependencies: [],
}) {}
```

**Examples:**

- `Typesense` (src/typesense.ts:5) - Typesense client service
- `Indexer` (src/db/indexer.ts:6) - Indexer database connection
- `Metadata` (src/db/metadata.ts:6) - Metadata database connection

**Usage:** Services are provided via `Layer.mergeAll()` in main.ts:111-116

### Generator Pattern

Effect generators (`Effect.gen`) enable imperative-style async code with automatic error handling:

```typescript
const program = Effect.gen(function* () {
  const service = yield* ServiceName;         // Get service from context
  const config = yield* getConfig;            // Get config
  const result = yield* Effect.promise(...);  // Wrap promises
  yield* Effect.logInfo("message");           // Side effects
  return result;
});
```

**Key usages:**

- Main application logic (src/main.ts:17)
- Setup functions (src/setup.ts:11, 38, 139)
- Config retrieval (src/config.ts:6)

### State Management Pattern

Timestamp tracking uses `Effect.Ref` for safe mutable state:

```typescript
// Pattern: Ref-based state class
export class Timestamp {
  get: Effect.Effect<string | null>;
  set: (value: string) => Effect.Effect<void>;

  constructor(private value: Ref.Ref<string | null>) {
    this.get = Ref.get(this.value);
    this.set = (value) => Ref.set(this.value, value);
  }
}
```

**Location:** src/timestamp-state.ts
**Usage:** Tracks the `createdAt` timestamp of the last processed collection to enable incremental syncing

### Scheduled Execution Pattern

The import loop uses `Effect.schedule` for periodic execution:

```typescript
Effect.gen(function* () {
  // Loop body
}).pipe(
  Effect.schedule(Schedule.spaced(Duration.millis(interval)))
);
```

**Location:** src/main.ts:103-105
**Behavior:** Repeats indefinitely with fixed delay between executions

### Configuration Pattern

Config values are retrieved using `Effect.Config` with type safety and defaults:

```typescript
const CONFIG_KEY = yield* Config.redacted("KEY");           // Sensitive values
const CONFIG_NUM = yield* Config.number("NUM")
  .pipe(Config.withDefault(defaultValue));                  // With defaults
const CONFIG_STR = yield* Config.string("STR")
  .pipe(Config.withDefault("default"));
```

**Location:** src/config.ts
**Pattern:** All config is loaded once and passed through Effect context

## Data Transformation Patterns

### Collection Enrichment

Collections from the indexer DB are enriched with computed fields:

```typescript
{
  ...collection,                                    // Original fields
  createdAt: new Date(c.createdAt).getTime(),      // Convert to Unix timestamp
  description: metadata?.description,               // Join from metadata DB
  shortCode: getShortCode(c.collectionNo, c.season), // Computed: "a101z", "aa101z"
  edition: getEdition(c.collectionNo, c.class),     // Computed: "1st", "2nd", "3rd"
}
```

**Location:** src/main.ts:73-87

### Short Code Generation

Converts season + collection number to compact format:

```typescript
// Pattern: Extract season letter and repeat by season number
// Atom01 -> "a", Binary01 -> "b", Cream01 -> "c"
// Season number determines repetitions: Atom01 -> "a", Atom02 -> "aa"
// Result: "a101z", "aa101z", "b101z", etc.
```

**Implementation:** src/collections.ts:20-27
**Examples:**

- Atom01, collectionNo: "101Z" → "a101z"
- Atom02, collectionNo: "101Z" → "aa101z"
- Binary01, collectionNo: "101Z" → "b101z"

### Edition Calculation

Maps First class collection numbers to grid editions:

```typescript
// Only applies to "First" class objekts
// 101-108 → "1st"
// 109-116 → "2nd"
// 117-120 → "3rd"
```

**Implementation:** src/collections.ts:1-18
**Purpose:** Supports grid completion tracking (8 First class objekts per edition)

## Database Access Patterns

### Incremental Query Pattern

Queries use timestamp-based filtering for incremental syncing:

```typescript
await indexer.query.collections.findMany({
  where: {
    createdAt: {
      gt: currentTimestamp ?? undefined,  // Only fetch new records
    },
  },
  orderBy: {
    createdAt: "asc",                     // Chronological order
  },
});
```

**Location:** src/main.ts:34-45
**State:** Timestamp is updated after each successful batch (src/main.ts:54)

### Join Pattern

Data is joined from two databases using in-memory correlation:

```typescript
// 1. Fetch collections from indexer DB
const collections = await indexer.query.collections.findMany(...);

// 2. Fetch descriptions for those collections from metadata DB
const slugs = collections.map(c => c.slug);
const descriptions = await metadata.query.objektMetadata.findMany({
  where: { collectionId: { in: slugs } },
  columns: { collectionId: true, description: true },
});

// 3. Join in memory
const joined = collections.map(c => ({
  ...c,
  description: descriptions.find(d => d.collectionId === c.slug)?.description
}));
```

**Location:** src/main.ts:57-87
**Rationale:** Two separate databases (indexer vs web) require application-level join

## Typesense Patterns

### Idempotent Setup Pattern

All setup operations are idempotent (safe to run multiple times):

```typescript
// Pattern: Check if resource exists, create only if missing
const existing = yield* Effect.promise(async () => {
  return await typesense.resource().retrieve().find(...);
});

if (existing) {
  return void 0;  // Already exists, skip creation
}

// Create new resource
yield* Effect.promise(async () => {
  await typesense.resource().create(...);
});
```

**Examples:**

- API key creation (src/setup.ts:11-33)
- Collection creation (src/setup.ts:38-132)

### Upsert on Conflict

Typesense imports use `action: "upsert"` to handle updates:

```typescript
await typesense.collections(COLLECTION_NAME).documents().import(chunk, {
  action: "upsert",  // Insert or update based on ID
});
```

**Location:** src/main.ts:96-98
**Behavior:** Updates existing documents or creates new ones automatically

### Bulk Import Pattern

Large datasets are chunked to avoid timeouts and memory issues:

```typescript
for (let i = 0; i < items.length; i += 500) {
  const chunk = items.slice(i, i + 500);
  await typesense.collections(...).documents().import(chunk, {
    action: "upsert",
  });
}
```

**Location:** src/main.ts:92-101
**Chunk Size:** 500 items per request

### Schema Definition Pattern

Typesense collections define indexed vs display-only fields:

```typescript
fields: [
  // Indexed fields (searchable/filterable)
  { name: "artist", type: "string", index: true, facet: true },
  { name: "member", type: "string", index: true, facet: true },

  // Display-only fields (not searchable)
  { name: "thumbnailImage", type: "string", index: false },
  { name: "frontImage", type: "string", index: false },
]
```

**Location:** src/setup.ts:53-127
**Facets:** Enable filtering/aggregation in search UI

### Synonym Management Pattern

Synonyms enable flexible searching (e.g., "OEC" finds "KimLip", "JinSoul", "Choerry"):

```typescript
// Pattern: Root term expands to synonyms
await typesense.collections(...).synonyms().upsert(id, {
  root: "oec",                          // Search term
  synonyms: ["KimLip", "JinSoul", "Choerry"]  // Matches these members
});
```

**Types:**

1. **Unit synonyms** (src/synonyms.ts:42-136) - Map unit names to member lists
2. **Member synonyms** (src/synonyms.ts:6-40) - Map abbreviations to full names
3. **Class synonyms** (src/synonyms.ts:138-145) - Map abbreviations to class names

**Setup:** src/setup.ts:139-183

## Error Handling

Effect-TS provides automatic error handling:

1. **Promise wrapping:** `Effect.promise()` converts Promise rejections to Effect errors
2. **Service failures:** Service initialization errors propagate automatically
3. **Config errors:** Missing environment variables fail fast at startup
4. **No explicit try/catch:** Effect runtime handles all errors

## Logging

Structured logging using `Effect.logInfo`:

```typescript
yield* Effect.logInfo(`Fetching collections from ${timestamp}`);
yield* Effect.logInfo(`Found ${collections.length} collections`);
yield* Effect.logInfo(`Upserted ${count} objects`);
```

**Locations:** Throughout main.ts and setup.ts

## Runtime

Application uses BunRuntime for execution:

```typescript
BunRuntime.runMain(
  main.pipe(
    Effect.provide(
      Layer.mergeAll(
        BunContext.layer,      // Bun platform context
        Typesense.Default,     // Typesense service
        Indexer.Default,       // Indexer DB service
        Metadata.Default,      // Metadata DB service
      ),
    ),
  ),
);
```

**Location:** src/main.ts:108-119
**Layer composition:** Services are provided via dependency injection

## Common Modification Patterns

### Adding New Fields to Typesense

1. Add field to schema in `src/setup.ts` fields array
2. Add transformation in `src/main.ts` zipped array (lines 73-87)
3. Optionally add helper function in `src/collections.ts`

### Adding New Synonyms

1. Add to appropriate dictionary in `src/synonyms.ts`
2. Add upsert logic in `src/setup.ts` setupTypesenseSynonyms (if new category)

### Changing Loop Interval

Set `LOOP_INTERVAL` environment variable (milliseconds)

### Adding Database Indexes

For performance, index frequently queried columns:

- Collections by `createdAt` (for incremental queries)
- Metadata by `collectionId` (for joins)

## Dependencies

- **Effect-TS** - Functional programming framework
- **Typesense** - Search engine client
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL (pg)** - Database driver
- **Bun** - JavaScript runtime (dev & prod)

## Related Files

- **Database schemas:** `@apollo/database` package
- **Shared types:** `@apollo/util` package (if applicable)
- **Configuration:** Root `docker-compose.yml` (Typesense service)
