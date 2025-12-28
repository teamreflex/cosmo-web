# Indexer App

This is a [Subsquid SDK](https://docs.sqd.ai/sdk/overview/) application for indexing Modhaus objekts on the Abstract blockchain. It processes and saves:

- every objekt collection type
- every unique objekt NFT
- every ownership change/transfer
- every COMO token balance change
- every gravity vote

## Technology Stack

- **Subsquid SDK** - EVM blockchain indexing framework
- **TypeORM** - Database ORM with manual model management
- **Bun** - Package manager (Node for build/runtime due to Subsquid requirements)
- **PostgreSQL** - Primary database

## Development Workflow

### Making Schema Changes

When adding or modifying entities, follow this exact workflow:

1. **Update GraphQL Schema:** Edit `schema.graphql` with new entities/fields
2. **Update TypeORM Model:** Manually edit corresponding file in `src/model/generated/`
3. **Create Migration:** Write a manual migration in `db/migrations/` following naming convention: `{timestamp}-Data.js`
4. **Sync Drizzle Schema:** Update corresponding schema in `/packages/database/src/indexer/schema.ts`
5. **Verify Changes:** Run `turbo typecheck` and `turbo lint`

### Migration Guidelines

**CRITICAL - DO NOT:**

- Run `sqd`, `subsquid-commands`, or `squid-*` commands (they wipe migrations and generate bad models)
- Use auto-generated migrations
- Delete the migrations directory

**DO:**

- Write all migrations manually
- Follow naming convention: `{timestamp}-Data.js`
- Include both `up()` and `down()` methods
- Test migrations locally before committing
- Include a short comment detailing what the change is for (ie: what does a new index seek to improve)

## Core Patterns & Conventions

### Address Normalization

Always normalize addresses to lowercase using the `addr()` utility:

```typescript
import { addr } from "@apollo/util";

const normalized = addr(rawAddress); // converts to lowercase
```

### UUID Generation

Use Node's built-in crypto for unique IDs:

```typescript
import { randomUUID } from "node:crypto";

new Transfer({ id: randomUUID(), ... });
```

### Batch Processing

Use the `chunk()` utility for parallel processing:

```typescript
import { chunk } from "@apollo/util";

await chunk(items, env.COSMO_PARALLEL_COUNT, async (chunk) => {
  const results = await Promise.allSettled(chunk.map(process));
  // handle results
});
```

### Buffer Pattern

Reduce database queries by maintaining in-memory Maps:

```typescript
const buffer = new Map<string, Entity>();

// Check buffer before DB
let entity = buffer.get(key);
if (!entity) {
  entity = await ctx.store.get(Entity, { where: { key } });
  if (entity) buffer.set(key, entity);
}
```

### Upsert Strategy

Always use upsert to handle both new and existing records:

```typescript
await ctx.store.upsert(Array.from(buffer.values()));
```

### Error Handling

Gracefully degrade with logging:

```typescript
const results = await Promise.allSettled(promises);
for (let i = 0; i < results.length; i++) {
  if (results[i].status === "rejected") {
    ctx.log.error(`Operation failed for item ${i}`);
    continue;
  }
  // process successful result
}
```

## Key Files & Structure

```
src/
├── main.ts           # Entry point with business logic
├── processor.ts      # Subsquid processor configuration
├── parser.ts         # Event/transaction parsing
├── env.ts            # Environment validation (Zod)
├── model/
│   └── generated/    # TypeORM entities (manually maintained)
│       ├── collection.model.ts
│       ├── objekt.model.ts
│       ├── transfer.model.ts
│       ├── comoBalance.model.ts
│       ├── vote.model.ts
│       └── marshal.ts    # Type transformers (bigint, etc.)
└── abi/              # Auto-generated contract interfaces
    ├── objekt.ts     # ERC-721 NFT contract
    ├── como.ts       # ERC-1155 token contract
    └── gravity.ts    # Voting contract

db/migrations/        # Manual migrations only
schema.graphql        # Source of truth for entity definitions
```

## Entity Relationships

### Collection

Represents an objekt collection type (e.g., "tripleS Atom01 Seoyeon 101Z").

**Key Fields:**

- `slug` - Unique identifier (indexed)
- `collectionId` - COSMO collection ID
- `season`, `member`, `artist`, `collectionNo`, `class` - Objekt metadata
- `onOffline` - Derived from `collectionNo` suffix (Z = online, A = offline)
- `comoAmount` - COMO tokens earned when collecting

**Relations:** `objekts[]`, `transfers[]`

### Objekt

Represents a single NFT instance.

**Key Fields:**

- `id` - Token ID (primary key)
- `serial` - Unique serial number within collection
- `owner` - Current owner address (normalized)
- `transferable` - Whether NFT can be transferred
- `mintedAt`, `receivedAt` - Timestamps

**Relations:** `collection`, `transfers[]`

### Transfer

Records every ownership change.

**Key Fields:**

- `id` - UUID
- `from`, `to` - Addresses (normalized)
- `tokenId` - Reference to Objekt
- `hash` - Transaction hash
- `timestamp` - Transfer time

**Relations:** `objekt`, `collection`

### ComoBalance

Tracks COMO token (ERC-1155) balances.

**Key Fields:**

- `id` - UUID
- `tokenId` - COMO token ID
- `owner` - Address (normalized)
- `amount` - Balance (uses `bigintTransformer`)

### Vote

Records gravity voting events.

**Key Fields:**

- `id` - UUID
- `from` - Voter address (normalized)
- `contract` - Gravity contract address
- `pollId` - Poll identifier
- `amount` - Vote weight (uses `bigintTransformer`)
- `hash`, `blockNumber` - Transaction details

## Important Gotchas

1. **Runtime:** Use Node (not Bun) for build and production due to Subsquid SDK requirements
2. **UUID Type:** Uses `varchar(36)` instead of PostgreSQL `uuid` type due to Subsquid casting limitations
3. **Address Normalization:** Always use `addr()` - never store raw addresses
4. **GraphQL Server:** Not actively used - schema only defines entity structure
5. **Keep Drizzle in Sync:** All model changes must be reflected in `/packages/database/src/indexer/schema.ts`
6. **Bun Compatibility:** Several dependencies manually updated for Bun (`glob`, `lru-cache`, `path-scurry`)

## Processing Flow

```
Blockchain Events
    ↓
parser.ts (parseBlocks)
    ↓
main.ts (business logic)
    ├── Buffer entities in Maps
    ├── Fetch metadata in batches
    ├── Handle errors gracefully
    └── Upsert to database
    ↓
TypeORM Store
    ↓
PostgreSQL Database
```
