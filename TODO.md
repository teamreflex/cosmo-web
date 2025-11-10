## monorepo

- [ ] remove root vercel.json once done with refactor
- [x] dev - setup pgbouncer for the pg server so HMR doesn't exhaust connections
- [x] dev - update start script to conditionally boot docker services based on env

## web

- [ ] ensure env var split is working and server vars aren't leaking to client
- [ ] move server code around so it's more isolated from RPC and queries
- [x] fix RoutedExpandableObjekt on objekt index
- [ ] re-add sentry once SDK is updated
- [x] wait for start fix: https://github.com/TanStack/router/issues/5372
  - [x] objekt list update
  - [x] objekt list delete
- [ ] do something with the grid detection code
- [ ] fix drawer issues & iOS 26 quirks
- [x] refactor cron jobs
- [x] confirm deployment on railway works
- [x] import db from neon
- [x] fix flicker with RoutedExpandableObjekt
- [ ] test self-hosted browserless

## indexer

- [x] confirm deployment on railway works
- [x] import db from digitalocean box
- [x] extract the set-band, process-status and rescan-metadata handlers into the web app

## typesense importer

- [x] confirm deployment on railway works

## typesense

- [ ] fix CORS config

### db migrations

```bash
# no compression
pg_dump "postgresql://" --no-owner --no-privileges -F c -f db.dump
pg_restore -d "postgresql://" --no-owner --no-privileges -v db.dump

# compression and parallel
pg_dump "postgresql://" --no-owner --no-privileges -F d -j 4 -f dump_directory/
pg_restore -d "postgresql://" --no-owner --no-privileges -j 4 -v dump_directory/
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

### production checklist

- [ ] bring indexer up to date
- [ ] create maintenance branch
- [ ] promote maintenance branch to prod in vercel
- [ ] dump prod neon db
- [ ] restore neon db to railway
- [ ] switch search.apollo.cafe to railway typesense service
- [ ] test prod web service using railway domain
- [ ] switch apollo.cafe to railway web service
