## monorepo

remove root vercel.json once done with refactor

## web

- ensure env var split is working and server vars aren't leaking to client
- move server code around so it's more isolated from RPC and queries
- fix RoutedExpandableObjekt on objekt index
- re-add sentry once SDK is updated
- wait for start fix: https://github.com/TanStack/router/issues/5372
  - objekt list update
  - objekt list delete
- do something with the grid detection code
- fix drawer issues & iOS 26 quirks
- refactor any vercel exclusive code
- refactor caching: https://nitro.build/guide/storage
- refactor cron jobs: https://nitro.build/guide/tasks#scheduled-tasks
- test railway deployment

## indexer

- extract the set-band, process-status and rescan-metadata handlers into the web app

## typesense

- tidy up
