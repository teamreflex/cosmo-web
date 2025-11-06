## monorepo

- [ ] remove root vercel.json once done with refactor
- [ ] dev - setup pgbouncer for the pg server so HMR doesn't exhaust connections

## web

- [ ] ensure env var split is working and server vars aren't leaking to client
- [ ] move server code around so it's more isolated from RPC and queries
- [ ] fix RoutedExpandableObjekt on objekt index
- [ ] re-add sentry once SDK is updated
- [ ] wait for start fix: https://github.com/TanStack/router/issues/5372
  - [ ] objekt list update
  - [ ] objekt list delete
- [ ] do something with the grid detection code
- [ ] fix drawer issues & iOS 26 quirks
- [ ] refactor caching: https://nitro.build/guide/storage
- [ ] refactor cron jobs: https://nitro.build/guide/tasks#scheduled-tasks
- [ ] confirm deployment on railway works
- [ ] import db from neon

## indexer

- [x] confirm deployment on railway works
- [ ] import db from digitalocean box
- [ ] extract the set-band, process-status and rescan-metadata handlers into the web app

## typesense importer

- [ ] tidy up
- [ ] confirm deployment on railway works

### db migrations

```bash
pg_dump "postgresql://" --no-owner --no-privileges -F c -f db.dump
pg_restore -d "postgresql://" --no-owner --no-privileges -v db.dump
```

```sql
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA drizzle TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA drizzle TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA drizzle TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA drizzle GRANT ALL ON TABLES TO postgres;
```
