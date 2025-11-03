## web

- ensure env var split is working and server vars aren't leaking to client
- move server code around so it's more isolated from RPC and queries
- fix RoutedExpandableObjekt on objekt index
- re-add sentry once SDK is updated
- wait for start fix: https://github.com/TanStack/router/issues/5372
  - objekt list update
  - objekt list delete
- do something with the grid detection code
- migrate to planetscale once new plans drop
- fix drawer issues & iOS 26 quirks

## indexer

- settle on database strategy:
  - migrate to planetscale
  - self-host w/ pgbouncer
  - self-host with drizzle-proxy
- extract the set-band, process-status and rescan-metadata handlers into a separate service

## typesense

- tidy up

## monorepo

- setup dockerfiles for each service for railway deployment
- setup docker for non-web services in dev
- extract drizzle schemas into a database package
