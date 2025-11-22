# Apollo

A platform for exploring objekts & gravities from [MODHAUS](https://www.mod-haus.com/)' **[Cosmo: the Gate](https://play.google.com/store/apps/details?id=com.modhaus.cosmo)** app via blockchain data.

**Apollo is not affiliated with, endorsed by or supported by MODHAUS or its artists.**

## Features

- View other user's collections via blockchain data
- View an index of every released objekt, number of copies and how it's obtained
- Fuzzy search through objekt collection metadata
- Create shareable objekt wishlists
- Calendar to see when monthly COMO drops are coming
- View objekt transfers
- Per member, season and class collection progress breakdowns
- Collection completion leaderboards
- View historical and live gravity results

## Project

- `apps/web`: Core Tanstack Start web app deployed at [apollo.cafe](https://apollo.cafe)
- `apps/indexer`: Subsquid blockchain indexer for cataloging Modhaus objekt collections
- `apps/typesense-import`: Sync new objekt collections to the Typesense database
- `packages/cosmo`: Types and requests for the COSMO API
- `packages/database`: Drizzle schemas for the web app and indexer databases
- `packages/eslint`: Shared ESLint config
- `packages/typescript`: Shared tsconfig.json file
- `packages/util`: Shared utility functions

## Requirements

- [Bun](https://bun.sh/) 1.3+
- [Postgres](https://www.postgresql.org/)
- [Redis](https://redis.io/) or [Valkey](https://valkey.io/)
- [Typesense](https://typesense.org/)
- [AWS SES](https://aws.amazon.com/ses/) credentials
- [Discord OAuth](https://discord.com/developers/docs/topics/oauth2) credentials
- [Twitter OAuth](https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/overview) credentials
- [Docker](https://www.docker.com/) (local development)

## Setup

```bash
git clone git@github.com:teamreflex/cosmo-web.git
cd cosmo-web
bun install
cp .env.example .env.local
turbo i18n
turbo db:migrate
turbo dev
```

## Tooling

- [Bun](https://bun.sh/)
- [Turborepo](https://turborepo.com/)
- [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Tailwind v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Subsquid](https://subsquid.io/)
- [Typesense](https://typesense.org/)

## License

Licensed under the [MIT license](https://github.com/teamreflex/cosmo-web/blob/refactor/abstract/LICENSE.md).

## Contact

- **Discord Server**: [discord.gg/A72VRX8FgK](https://discord.gg/A72VRX8FgK)
- **Email**: kyle at reflex.lol
- **Discord**: kairunz
- **Cosmo ID**: Kairu
