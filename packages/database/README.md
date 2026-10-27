# @apollo/database

Drizzle schemas, relations and row types for Apollo's two Postgres databases, shared by every app that queries them.

| Import                               | Holds                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `@apollo/database/web/schema`        | every web table with its indexes and CHECK constraints, plus the Better Auth tables re-exported; the web DDL's source of truth |
| `@apollo/database/web/relations`     | relational query builder definitions, passed to `drizzle({ client, relations })`                                               |
| `@apollo/database/web/types`         | row types, the value lists enums are built from, jsonb payload unions                                                          |
| `@apollo/database/web/sql`           | SQL fragments apps/web and apps/schedules must compute identically                                                             |
| `@apollo/database/auth`              | Better Auth tables and the `user_role` enum, written by `auth:generate` ([docs/auth.md](../../docs/auth.md))                   |
| `@apollo/database/custom`            | the `citext` column type and the `createdAt` / `createdTimestamp()` helpers                                                    |
| `@apollo/database/indexer/schema`    | a hand-kept mirror of the indexer DDL, for typing queries only                                                                 |
| `@apollo/database/indexer/relations` | relational query builder definitions for the indexer                                                                           |
| `@apollo/database/indexer/types`     | row types for the chain tables                                                                                                 |

- Import by subpath. A bare `@apollo/database` import doesn't resolve.
- Web migrations are generated from this package into `apps/web/drizzle`. Indexer migrations are written by hand in `apps/indexer/db/migrations`.
- Conventions, cross-database identifiers and query rules: [docs/database.md](../../docs/database.md). Writing and applying migrations: [docs/migrations.md](../../docs/migrations.md).
