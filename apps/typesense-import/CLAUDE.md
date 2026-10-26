# typesense-import

Rules for changing the importer. The flow, environment and local setup are in [`README.md`](README.md).

## The contract with apps/web

`apps/web/src/lib/client/typesense.ts` queries the `collections` collection from the browser and the server with the search-only key. Every field it names must be declared in `setupTypesenseCollection()` with the right flags:

| Web uses it in | Fields                                                         | Needs in `src/setup.ts`              |
| -------------- | -------------------------------------------------------------- | ------------------------------------ |
| `query_by`     | `member`, `description`, `season`, `shortCode`, `collectionNo` | `index: true`, string                |
| `filter_by`    | `artist`, `member`, `season`, `class`, `collectionNo`          | `index: true`                        |
| `sort_by`      | `createdAt`, `collectionNo`, `memberSortOrder`                 | numeric, or `sort: true` on a string |

- A renamed or de-indexed field fails at query time in the browser, not at type-check time.
- Fields web only displays, such as image URLs, are `index: false`.
- Web types a hit as `IndexedObjekt`, the indexer `Collection` row, so documents keep every column under its own name. A hit's `createdAt` is epoch milliseconds, not the row's timestamp string.
- Typesense leaves out optional fields whose value is null. `toIndexedObjekt()` in web restores the image versions to null; a new optional field that web reads needs the same.
- Documents spread every indexer `collection` column (`...c` in `src/main.ts`), so a column the schema doesn't declare is still stored, unindexed.

## Schema changes

- `setupTypesenseCollection()` drops and recreates the collection when the existing one fails its `upToDate` check, a hardcoded list of fields.
- Add each new field to that check, or a running Typesense never gets it.
- Recreating deletes every document. The first tick after boot refills them, because the watermark starts empty, and search is incomplete until it finishes.

## Synonyms

- `setupTypesenseSynonyms()` upserts one synonym per entry of the `units`, `members` and `classes` dictionaries in `src/synonyms.ts`.
- Synonyms are upserted by id and never deleted, so removing a dictionary entry leaves its synonym in Typesense until the collection is recreated.
- A new entry in an existing dictionary needs no setup change. A new dictionary needs its own loop in `setupTypesenseSynonyms()`.

## Conventions

- Services follow the shared Effect conventions in [`docs/tooling.md`](../../docs/tooling.md).
- Typesense calls are wrapped in `Effect.tryPromise` with one `Data.TaggedError` per failure mode.
- Only the import tick is wrapped in `Effect.catchCause`. Setup stays unwrapped so a broken Typesense fails the boot.

## Where to start

- New field:
  1. Declare it in `setupTypesenseCollection()` in `src/setup.ts`.
  2. Add it to the `upToDate` check.
  3. A computed field gets a helper in `src/collections.ts` and an entry on the `zipped` document in `src/main.ts`.
  4. If web queries or reads it, update `apps/web/src/lib/client/typesense.ts`.
- `shortCode` and `edition` rules: the examples on `getShortCode()` and `getEdition()` in `src/collections.ts`.
