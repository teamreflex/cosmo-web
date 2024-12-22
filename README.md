# cosmo-web (Apollo)

This project aims to build a web based version of [MODHAUS](https://www.mod-haus.com/)' **[Cosmo: the Gate](https://play.google.com/store/apps/details?id=com.modhaus.cosmo)** mobile application, replicate its core features as close as possible, and add new features on top.

**Apollo is not affiliated with, endorsed by or supported by MODHAUS or its artists.**

This project experiments with new tooling such as [Next.js App Router streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming#streaming-with-suspense), [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components), [React Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) and [Tailwind v4](https://tailwindcss.com/docs/v4-beta).

<details>
  <summary><b>Replicated Features</b></summary>

- Signing into COSMO accounts via Ramper magic links
- Viewing in-app news feed and exclusive COSMO content
- Sending objekts over the Polygon blockchain
- Scanning objekt QR codes
- Claiming event rewards
- Completing objekt grids
- View and vote in Gravity events
- View and like Rekord posts
- View activity history, rankings, badges

</details>

<details>
  <summary><b>New Features</b></summary>

- "lock" objekts to prevent them from being traded (like the Superstar games)
- View other user's collections via COSMO or Polygon blockchain
- Pin objekts to the top of your profile
- Extensive profile privacy options
- View an index of every released objekt, number of copies and how it's obtained
- Wishlist builder with sharable links
- Calendar to see when monthly COMO drops are coming
- View objekt transfers
- Per member, season and class collection progress breakdowns
- Collection completion leaderboards
- Scan an objekt without claiming
- Indicator for Polygon network disruptions

</details>

### Notes

- **There's no app version or user agent spoofing. It's entirely possible for MODHAUS to detect usage of this. Use at your own risk.**

## Requirements

- [Node.js](https://nodejs.org/en/) 20.17
- [Alchemy](https://www.alchemy.com/) API key
- [Neon](https://neon.tech/) instance
  - Or swap this out for another Postgres compatible database with minimal code changes
- Postgres instance with HTTP proxy
  - The accompanying [blockchain indexer](https://github.com/teamreflex/cosmo-db) has containerized Postgres 15.5 and an HTTP proxy running under [Bun](https://bun.sh/).
  - Migration files can also be found there
- Alternatively, you can use Docker to run a local Postgres instance with two databases, a Neon serverless proxy and a Drizzle HTTP proxy.

## Setup (Neon)

```bash
git clone git@github.com:teamreflex/cosmo-web.git
cd cosmo-web
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

## Setup (Local Docker)

Download a copy of the indexer database from [MEGA](https://mega.nz/file/LgkWQKjD#21rkI2A0f1yO5RV712IoJgZHAbWUIn6ntU7p_BHfTtk) and place it into the root of the project. This contains:

- All objekt collections as of 240422
- Objekt transfers between 240422 and 240330~
- Objekt ownership between 240422 and 240330~

```bash
git clone git@github.com:teamreflex/cosmo-web.git
cd cosmo-web
pnpm install
cp .env.example .env.local
docker compose up -d
psql -U postgres -h db.localtest.me -d indexer -f indexer-trimmed.sql
pnpm db:migrate
pnpm dev
```

## Tooling

- [Next 15](https://nextjs.org/)
  - [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
  - [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)
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
