# cosmo-web (Apollo)

A platform for exploring objekts & gravities from [MODHAUS](https://www.mod-haus.com/)' **[Cosmo: the Gate](https://play.google.com/store/apps/details?id=com.modhaus.cosmo)** app via blockchain data.

**Apollo is not affiliated with, endorsed by or supported by MODHAUS or its artists.**

## Note

On April 18th 2025, MODHAUS migrated COSMO over to a new blockchain and a new authentication provider, with encryption that prevents tampering with the sign-in process. This `refactor/abstract` branch is a stripped down version of the platform with almost all COSMO connectivity removed.

The [`main`](https://github.com/teamreflex/cosmo-web/blob/main) branch remains as the final Polygon-compatible version before the migration occurred. It will not work with the current version of the COSMO API.

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

## Requirements

- [Node.js](https://nodejs.org/en/) 22.x
- [Blockchain indexer](https://github.com/teamreflex/cosmo-db) instance w/ Drizzle HTTP proxy
- [Neon](https://neon.tech/) instance
- [Upstash](https://upstash.com/) instance
- [Typesense](https://typesense.org/) instance
- [Alchemy](https://www.alchemy.com/) API key
- [AWS SES](https://aws.amazon.com/ses/) credentials
- [Discord OAuth](https://discord.com/developers/docs/topics/oauth2) credentials
- [Twitter OAuth](https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/overview) credentials
- [Browserless](https://www.browserless.io/) credentials

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
- [Tailwind v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Neon](https://neon.tech/)
- [Drizzle ORM](https://orm.drizzle.team/)

## License

Licensed under the [MIT license](https://github.com/teamreflex/cosmo-web/blob/refactor/abstract/LICENSE.md).

## Contact

- **Discord Server**: [discord.gg/A72VRX8FgK](https://discord.gg/A72VRX8FgK)
- **Email**: kyle at reflex.lol
- **Discord**: kairunz
- **Cosmo ID**: Kairu
