## monorepo

- [ ] remove root vercel.json once vercel deployment is made redundant
- [x] dev - setup pgbouncer for the pg server so HMR doesn't exhaust connections
- [x] dev - update start script to conditionally boot docker services based on env

## web

- [x] ensure env var split is working and server vars aren't leaking to client
- [ ] move server code around so it's more isolated from RPC and queries
- [x] fix RoutedExpandableObjekt on objekt index
- [x] re-add sentry once SDK is updated
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
- [x] load test?
- [x] re-implement top votes and top users for gravity display
- [x] optimize gravity data fetching
- [ ] event system
  - [x] general: add seasons? then create a SeasonBadge component with proper colors. for idntt use colors per season: winter - lightblue, summer - yellow, spring - green, autumn - brownish red
  - [x] general: add proper badges for the event types
  - [x] general: reset migrations to reuse objekt_metadata table by making event_id nullable
  - [x] index: show current event based on start/end dates, maybe a carousel for multiple?
  - [ ] index: add filter and sort options
  - [x] event: make header better
  - [x] era: add custom image for non-album eras
- [x] fix scuffed admin panel layout

## indexer

- [x] confirm deployment on railway works
- [x] import db from digitalocean box
- [x] extract the set-band, process-status and rescan-metadata handlers into the web app

## typesense importer

- [x] confirm deployment on railway works

## typesense

- [x] fix CORS config
