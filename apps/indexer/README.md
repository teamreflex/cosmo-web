# indexer

A [Subsquid](https://subsquid.io/) indexer for ARTMS and tripleS NFTs.

`glob`, `lru-cache` & `path-scurry` versions used in the Subsquid SDK do not work in Bun, which is why they've been manually updated in this package.

When starting an indexer database from scratch, this will only contain data since the April 2025 migration to Abstract. Only the production database used for apollo.cafe contains any migrated data from an old Polygon version of the database.
