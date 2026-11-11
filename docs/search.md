# Search

Objekt search runs on Typesense: the `sync-typesense` task in apps/schedules fills the `collections` collection, and apps/web queries it from the browser and the server.

## The sync

```
sync-typesense: once at boot, then every 5 minutes
      |
      v
Typesense.imported -- none (first run in this process) --> setupTypesenseApiKey
      |                                                    setupTypesenseCollection
      | some {watermark, flagged}                          setupTypesenseSynonyms
      v                                                           |
indexer DB --> flaggedNow = ids where unobtainable = true  <------+
           --> new        = createdAt > watermark (every collection on the first run)
           --> flipped    = ids whose flag differs from flagged, minus new
                 |
   nothing to import? --yes--> imported = some {watermark, flaggedNow}, done
                 | no
                 v  per chunk of 500
web DB     --> collection_data.description per slug   } joined in memory: the two
indexer DB --> members.sortOrder per member name      } databases are separate
                 |  + shortCode, edition, createdAt as epoch ms
                 v
Typesense documents().import(action: "upsert")
                 |
      ok --------+-------- error
      v                    v
imported = some {        imported unchanged, so the retry and the
 newest new createdAt    next run import the same batch again
 (watermark if only
 flips), flaggedNow }
```

- `unobtainable` is flipped by hand long after `createdAt`, so the watermark alone never sees the change.
- The flag set is read before the new collections, so a flip that races a run is caught on the next one.
- The watermark is the newest imported `createdAt`, never the clock. `createdAt` is the block time of a collection's first mint and the indexer writes the row after it, so a clock watermark would skip a collection written late.
- `Typesense.imported` lives in memory, so a restart imports every collection again. That is harmless because imports upsert.
- Setup runs only on that first run, because recreating the collection deletes every document and the same run refills them.
- The `Typesense` service builds its client without a request, so a Typesense outage fails this task's runs and nothing else in apps/schedules.
- `bun run task sync-typesense` is a new process, so it always sets up and imports everything.
- Nothing deletes a document, so a collection that leaves the indexer stays in search until the collection is recreated.

## The contract with apps/web

`apps/web/src/lib/client/typesense.ts` queries the `collections` collection with the search-only key. Every field it names must be declared in `setupTypesenseCollection()` (`apps/schedules/src/search/setup.ts`) with the right flags:

| Web uses it in | Fields                                                         | Needs in `setupTypesenseCollection()` |
| -------------- | -------------------------------------------------------------- | ------------------------------------- |
| `query_by`     | `member`, `description`, `season`, `shortCode`, `collectionNo` | `index: true`, string                 |
| `filter_by`    | `artist`, `member`, `season`, `class`, `collectionNo`          | `index: true`                         |
| `sort_by`      | `createdAt`, `collectionNo`, `memberSortOrder`                 | numeric, or `sort: true` on a string  |

- A renamed or de-indexed field fails at query time in the browser, not at type-check time.
- Fields web only displays, such as image URLs, are `index: false`.
- Web types a hit as `IndexedObjekt`, the indexer `Collection` row, so documents keep every column under its own name. A hit's `createdAt` is epoch milliseconds, not the row's timestamp string.
- Typesense leaves out optional fields whose value is null. `toIndexedObjekt()` in web restores the image versions to null; a new optional field that web reads needs the same.
- Documents spread every indexer `collection` column (`...c` in `apps/schedules/src/functions/sync-typesense.ts`), so a column the schema doesn't declare is still stored, unindexed.

## Schema changes

- `setupTypesenseCollection()` drops and recreates the collection when the existing one fails its `upToDate` check, a hardcoded list of fields.
- Add each new field to that check, or a running Typesense never gets it.
- Search is incomplete from the moment the collection is dropped until that run's import finishes.

## Synonyms

- `setupTypesenseSynonyms()` upserts one synonym per entry of the `units`, `members` and `classes` dictionaries in `apps/schedules/src/search/synonyms.ts`.
- Synonyms are upserted by id and never deleted, so removing a dictionary entry leaves its synonym in Typesense until the collection is recreated.
- A new entry in an existing dictionary needs no setup change. A new dictionary needs its own loop in `setupTypesenseSynonyms()`.

## Keys

- apps/schedules holds the admin key (`TYPESENSE_API_KEY`), which setup and the imports need.
- `setupTypesenseApiKey()` creates the search-only `frontend` key when it is missing and logs its value once. The web app's `VITE_TYPESENSE_KEY` must be that value; locally both use the dev admin key.

## Running locally

- `DEV_TYPESENSE=true` starts Typesense. The task runs with the rest of apps/schedules, or alone with `bun run task sync-typesense` there.
- Run `turbo image:mirror` before the first run, for the reason in [`packages/image/README.md`](../packages/image/README.md#mirroring-a-whole-environment).

## Where to start

- New field:
  1. Declare it in `setupTypesenseCollection()`.
  2. Add it to the `upToDate` check.
  3. A computed field gets a helper in `apps/schedules/src/search/collections.ts` and an entry on the document in `sync-typesense.ts`.
  4. If web queries or reads it, update `apps/web/src/lib/client/typesense.ts`.
- `shortCode` and `edition` rules: the examples on `getShortCode()` and `getEdition()` in `apps/schedules/src/search/collections.ts`.
