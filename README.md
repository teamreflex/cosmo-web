# cosmo-web (Apollo)

This project aims to build a web based version of [MODHAUS](https://www.mod-haus.com/)' **[Cosmo: the Gate](https://play.google.com/store/apps/details?id=com.modhaus.cosmo)** mobile application, replicate its core features as close as possible, and add new features on top.

**Apollo is not affiliated with, endorsed by or supported by MODHAUS or its artists.**

## Note

On April 18th 2025, MODHAUS migrated COSMO over to a new blockchain and to a new authentication provider, with encryption that prevents tampering with the sign-in process. This `refactor/abstract` branch is a stripped down version of the platform with almost all COSMO features removed and migrated over to using the Abstract blockchain.

The [`main`](https://github.com/teamreflex/cosmo-web/blob/main) branch remains as the final Polygon-compatible version before the migration occurred. It will not work with the current version of the COSMO API.

## Features

- View other user's collections via blockchain data
- View an index of every released objekt, number of copies and how it's obtained
- Calendar to see when monthly COMO drops are coming
- View objekt transfers
- Per member, season and class collection progress breakdowns
- Collection completion leaderboards
- Indicator for blockchain network disruptions

## Requirements

- [Node.js](https://nodejs.org/en/) 22.x
- [Alchemy](https://www.alchemy.com/) API key
- [Neon](https://neon.tech/) instance
  - Or swap this out for another Postgres compatible database with minimal code changes
- Postgres instance with HTTP proxy
  - The accompanying [blockchain indexer](https://github.com/teamreflex/cosmo-db) has containerized Postgres 15.5 and an HTTP proxy running under [Bun](https://bun.sh/).
  - Migration files can also be found there
- Alternatively, you can use Docker to run a local Postgres instance with two databases, a Neon serverless proxy and a Drizzle HTTP proxy.

## Setup

```bash
git clone git@github.com:teamreflex/cosmo-web.git
cd cosmo-web
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

## Tooling

- [Next 15](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Tailwind v4](https://tailwindcss.com/)
- [Neon](https://neon.tech/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Alchemy](https://www.alchemy.com/)

## License

Licensed under the [MIT license](https://github.com/teamreflex/cosmo-web/blob/main/LICENSE.md).

## Contact

- **Discord Server**: https://discord.gg/A72VRX8FgK
- **Email**: kyle at reflex.lol
- **Discord**: kairunz
- **Cosmo ID**: Kairu
