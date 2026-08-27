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

## Runtime: Node, not Bun

Bun is only the package manager for this app. The build (`tsc`) and the production process run on Node because the Subsquid SDK does not work under Bun — the Dockerfile installs with Bun but builds and runs on `node:22-slim`.

Consequences:

- `@types/node` is pinned to the 22.x line (`^22.7.5`) to match the `node:22-slim` runtime image. Node types must track the Docker runtime version, not float with whatever bun-types pulls in.
- TypeScript 7 (native tsgo) does not reliably auto-include packages from `node_modules/@types`, so the tsconfig declares `"types": ["node"]` explicitly. Without it, an install reshuffling the isolated-linker layout can silently drop Node globals (`process`, `Buffer`, `setTimeout`), surfacing as TS2591 "Cannot find name" — check the tsconfig `types` field before diagnosing a missing dependency. The same applies to every workspace: Bun-runtime packages declare `"types": ["bun"]` via the shared tsconfig.bun.json.

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

### Online DDL

The Subsquid migration runner hard-codes `transaction: 'all'`, so `CONCURRENTLY` DDL cannot run through migrations. Run it out-of-band via `psql` (autocommit, one statement at a time) — the indexer's short batched write transactions mean `CONCURRENTLY` index builds/drops drain in seconds even on the ~25M-row `transfer` table — then ship an idempotent `IF [NOT] EXISTS` migration as the record.

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

## Key Files

- `schema.graphql` — source of truth for entity definitions; TypeORM entities in `src/model/generated/` are manually kept in sync with it (do not regenerate)
- `src/processor.ts` — Subsquid processor configuration; `src/parser.ts` — event parsing; `src/main.ts` — business logic
- `src/abi/` — auto-generated contract interfaces (objekt = ERC-721 NFT, como = ERC-1155 token, gravity = voting)
- `db/migrations/` — manual migrations only

Entity fields and relations are defined in `schema.graphql` and mirrored in `packages/database/src/indexer/schema.ts` — read those directly rather than relying on prose.

## Important Gotchas

1. **Runtime:** Use Node (not Bun) for build and production due to Subsquid SDK requirements
2. **Workspace package imports:** Node runs workspace packages (`@apollo/cosmo`, `@apollo/util`) as raw `.ts` source via type stripping, so relative imports inside those packages must use explicit `.ts` extensions — extensionless or `.js` specifiers fail at runtime with `ERR_MODULE_NOT_FOUND` (Bun-run apps tolerate both, so only the indexer surfaces it)
3. **UUID Type:** Uses `varchar(36)` instead of PostgreSQL `uuid` type due to Subsquid casting limitations
4. **Address Normalization:** Always use `addr()` - never store raw addresses
5. **GraphQL Server:** Not actively used - schema only defines entity structure
6. **Keep Drizzle in Sync:** All model changes must be reflected in `/packages/database/src/indexer/schema.ts`
7. **Bun Compatibility:** Several dependencies manually updated for Bun (`glob`, `lru-cache`, `path-scurry`)
8. **Autovacuum reloptions are live-only:** `objekt` and `transfer` have per-table autovacuum settings applied directly in production (not in any migration) because the default thresholds let the visibility map go stale under the constant owner-rewrite churn. Re-apply them by hand after any from-scratch database rebuild.

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
