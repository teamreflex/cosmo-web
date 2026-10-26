# typesense-import

Effect daemon that copies objekt collections from the indexer database into Typesense, which powers objekt search in the web app. Rules for changing it are in [`CLAUDE.md`](CLAUDE.md).

## Flow

```
boot (any failure here is fatal)
  setupTypesenseApiKey      create the "frontend" search-only key if missing
  setupTypesenseCollection  create "collections", or drop and recreate a stale one
  setupTypesenseSynonyms    upsert the synonym dictionaries

every LOOP_INTERVAL ms
  indexer DB --> flaggedNow = ids where unobtainable = true
             --> new        = collections with createdAt > watermark (all, first tick)
             --> flipped    = ids whose flag changed since the last good tick, minus new
                   |
     neither new nor flipped? --yes--> watermark = tick start, keep flaggedNow, done
                   | no
                   v
  web DB     --> collection_data.description per slug  } joined in memory: the two
  indexer DB --> members.sortOrder per member name     } databases are separate
                   |
                   v  + shortCode, edition, createdAt as epoch ms
  Typesense documents().import(action: "upsert"), chunks of 500
                   |
        ok --------+-------- error (Effect.catchCause)
        v                    v
  watermark = newest     log the cause, keep the watermark and flags;
  new createdAt (tick    the next tick re-fetches the same batch
  start if only flips),
  keep flaggedNow
```

- `unobtainable` is flipped by hand long after `createdAt`, so the watermark alone never sees the change.
- The flag set is read before the new collections, so a flip that races a tick is caught on the next one.
- The watermark and the flag set live in memory, so a restart re-imports every collection. That is harmless because imports upsert.

## Environment

| Variable               | Default           | Used for                                       |
| ---------------------- | ----------------- | ---------------------------------------------- |
| `INDEXER_DATABASE_URL` | -                 | Collections, members and the unobtainable flag |
| `WEB_DATABASE_URL`     | -                 | Collection descriptions                        |
| `TYPESENSE_URL`        | `typesense`       | Typesense node                                 |
| `TYPESENSE_API_KEY`    | -                 | Admin key, for setup and imports               |
| `LOOP_INTERVAL`        | `600000` (10 min) | Milliseconds between ticks                     |

- The search-only key's value is logged once, when setup creates it. The web app's `VITE_TYPESENSE_KEY` must be that value; locally both use the dev admin key.
- `.env.example` sets `TYPESENSE_IMPORT_LOOP_INTERVAL`, which only the `import-server` docker-compose service maps to `LOOP_INTERVAL`.

## Running locally

- `DEV_IMPORTER=true` in `.env` starts it as the `import-server` docker-compose service alongside `turbo dev`.
- `turbo dev --filter typesense-import` runs it on the host from the root `.env` instead, at the 10-minute default unless `LOOP_INTERVAL` is set.
- Run `turbo image:mirror` before the first import, for the reason in [`packages/image/README.md`](../../packages/image/README.md#mirroring-a-whole-environment).
