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
- [x] fix drawer issues & iOS 26 quirks
- [x] refactor cron jobs
- [x] confirm deployment on railway works
- [x] import db from neon
- [x] fix flicker with RoutedExpandableObjekt
- [x] test self-hosted browserless
- [x] fix paraglide middleware
- [x] fix sort filter flicker
- [x] fix layout shift in profile layout
- [ ] load test?
- [ ] reproduce cosmo leaderboards using transfers table to only count mints

## indexer

- [x] confirm deployment on railway works
- [x] import db from digitalocean box
- [x] extract the set-band, process-status and rescan-metadata handlers into the web app

## typesense importer

- [x] confirm deployment on railway works

## typesense

- [x] fix CORS config

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

- [x] bring indexer up to date
- [x] point nextjs deployment to railway typesense
- [x] create maintenance branch
- [ ] promote maintenance branch to prod in vercel
- [ ] dump prod neon db
- [ ] restore neon db to railway
- [x] switch search.apollo.cafe to railway typesense service
- [x] update typesense settings in railway:
  - [x] public URL to search.apollo.cafe
  - [x] CORS domain to https://apollo.cafe
- [ ] update web app domain to apollo.cafe in railway
- [ ] switch apollo.cafe to railway web service in cloudflare
