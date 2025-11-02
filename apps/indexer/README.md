# cosmo-db

A [Subsquid](https://subsquid.io/) indexer for ARTMS and tripleS NFTs.

**NOTE:** On April 18th 2025, COSMO was migrated from the Polygon blockchain over to Abstract. The last snapshot of the project using Polygon can be found on the [`checkpoint/polygon`](https://github.com/teamreflex/cosmo-db/tree/checkpoint/polygon) branch. `main` contains the latest version running on Abstract.

## Setup

```bash
$ git clone git@github.com:teamreflex/cosmo-db.git
$ cd cosmo-db
$ pnpm i
$ cp .env.example .env
$ docker compose up -d
```

## Service Configuration

### db

Postgres 15 database server.

- `DB_PORT`: Port to expose the server on. Internally it still uses the default port.
- `DB_READ_USER`: Creates a user with this name, only with SELECT privileges.
- `DB_READ_PASS`: Password for the read user.

### processor

Subsquid processor that parses and stores data from the chain.

- `SQD_ENDPOINT`: Subsquid archive endpoint.
- `RPC_ENDPOINT`: RPC endpoint to use for the chain.
- `RPC_RATE_LIMIT`: Rate limit for the RPC endpoint (req/s).
- `RPC_FINALITY`: Finality confirmation for RPC ingestion.
- `ENABLE_OBJEKTS`: Enable objekt processing.
- `COSMO_PARALLEL_COUNT`: Number of objekts to fetch metadata for in parallel.

### drizzle-proxy

HTTP server that exposes the database for use with [Drizzle ORM's HTTP proxy](https://orm.drizzle.team/docs/get-started-postgresql#http-proxy) support for serverless environments.

- `PROXY_HTTP_PORT`: Port to expose the server on.
- `PROXY_KEY`: Key to use for authentication.
- `PROXY_CACHE_MAX_AGE`: Max age (in seconds) to cache the `/status` endpoint for.

## Tooling

- [Subsquid](https://subsquid.io/)
- [Bun](https://bun.sh/)
- [Hono](https://hono.dev/)

## License

Licensed under the [MIT license](https://github.com/teamreflex/cosmo-db/blob/main/LICENSE.md).

## Contact

- **Email**: kyle at reflex.lol
- **Discord**: kairunz
- **Cosmo ID**: Kairu
