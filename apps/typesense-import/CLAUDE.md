# Typesense Import

Effect-TS service that continuously syncs new objekt collections from the indexer database into Typesense, powering fuzzy objekt search in the web app.

## Flow

1. **Setup** (startup, idempotent — safe to re-run): create the search-only API key, the collection schema, and the synonym sets (`src/setup.ts`).
2. **Import loop** (`src/main.ts`, repeats every `LOOP_INTERVAL` ms): fetch collections created after the last-seen timestamp (an in-memory `Ref`, so a restart re-imports from scratch — harmless because imports upsert), enrich them, and bulk-upsert into Typesense in chunks of 500. The watermark only advances after a fully successful upsert, so a failed tick re-fetches and re-upserts the whole batch on the next tick.

Two databases are involved: collections and member sort order come from the **indexer** DB, descriptions from the **metadata** (web) DB. They are separate Postgres instances, so the join happens in memory on `collection.slug`.

## Domain semantics

- `shortCode` (`src/collections.ts`): compact searchable code — season letter repeated by season number, plus collection number. Atom01 101Z → `a101z`, Atom02 101Z → `aa101z`, Binary01 → `b101z`. The `idntt` artist keeps its raw `collectionNo` as-is.
- `edition` (`src/collections.ts`): First class only — 101–108 → `1st`, 109–116 → `2nd`, 117–120 → `3rd`. Supports grid edition filtering.
- Synonyms (`src/synonyms.ts`) let unit names and abbreviations match members, e.g. `oec` → KimLip, JinSoul, Choerry. Three dictionaries: units, member abbreviations, class abbreviations.

## Conventions

- Standard Effect (v4) patterns: `Context.Service` classes with a `make:` effect and a hand-written `static readonly layer` (`Layer.effect(this, this.make)` + `Layer.provide` for dependencies — v4 has no auto-generated `.Default`), provided via `Layer.mergeAll`; config through the `Env` service (`Effect.Config`, secrets use `Config.redacted`); non-Effect promises (Typesense) wrapped in `Effect.tryPromise` with per-failure-mode `Data.TaggedError` classes. The `Indexer`/`Metadata` services are drizzle's Effect API via `@apollo/drizzle-bun-effect` (a scoped Bun `SQL` client), so DB queries are yielded directly and fail with drizzle's typed errors. Use context7 for Effect API docs.
- Failure handling: each import-loop tick is wrapped in `Effect.catchCause` — a transient failure logs its cause, the watermark stays put, and the batch is retried on the next tick. Setup effects have no such wrapper and stay fatal at boot.
- Typesense schema fields are either indexed (searchable/facetable) or display-only (`index: false`) — image URLs and the like should not be indexed.

## Common changes

- **New Typesense field:** add it to the schema in `src/setup.ts` and to the enrichment mapping in `src/main.ts`; computed fields get a helper in `src/collections.ts`. Schema changes only apply to newly created collections — an existing Typesense collection must be dropped or altered manually.
- **New synonym:** add to the right dictionary in `src/synonyms.ts`; only a new *category* needs setup logic in `src/setup.ts`.
