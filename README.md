# cosmo-web (Apollo)

This project aims to build a web based version of [MODHAUS](https://www.mod-haus.com/)' **[Cosmo: the Gate](https://play.google.com/store/apps/details?id=com.modhaus.cosmo)** mobile application, replicate its core features as close as possible, and add new features on top.

While mostly an exercise in learning React, it makes extensive use of the latest Vercel & Next features like [streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming#streaming-with-suspense), [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components), [React Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations), [image optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images), [Vercel Data Cache](https://nextjs.org/docs/app/building-your-application/caching#data-cache), [`unstable_cache`](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).

Supersedes the [objekts.jinsoul.tv](https://github.com/teamreflex/objekts-svelte) Svelte app.

<details>
  <summary><b>Replicated Features</b></summary>

- Authentication
  - Sign in with Ramper
  - COSMO user/token fetching
  - Token refreshing
  - Sign out
  - Per-artist profile image display
  - Ramper wallet decryption
- Objekts/COMO
  - Fetching owned objekts
  - Sending objekts to another COSMO user
  - Displaying reason for untransferable objekts - e.g. used for grid vs. not transferrable (event, welcome) vs. pending mint
  - All available filters
  - Display COMO balances
  - Claiming event rewards
  - Scan QR codes for claiming objekts
- Grid
  - Displaying grid completion stats
  - Displaying available seasons and editions
  - Displaying grid per member with pre-selected objekts
  - Ability to select a different objekt to use for a grid slot
  - Submitting completed grids and claiming the reward
- Artist
  - Fetching artist information
  - Artist switching (homepage defaults to selected)
- News
  - Displaying homepage news feed
  - Displaying "today's atmosphere" and "COSMO exclusive" feeds
  - Inline playback of exclusive m3u8 streams (broken on iOS due to HLS)
- Gravity
  - Displaying list of gravity events
  - Render dynamic gravity event description
  - Display details about a specific gravity event (ranking, leaderboard etc)
- Rekord
  - Displaying "today's rekord" on homepage
  - Displaying "top rekords", all rekords, my rekords and rekord archive
  - Liking & unliking of rekords
- Activity
  - Per-member objekt breakdown
  - Day countdown since joining (welcome panel)
  - Objekt, grid and gravity history
  - Badge display
  - Rankings

</details>

<details>
  <summary><b>New Features</b></summary>

- "lock" an objekt to prevent it from being sent to another user (like the Superstar games)
- Fetching other user's collections
  - Includes user search box with recent history
  - Filter state is stored in the URL for sharing
  - COSMO ID or Polygon address can be used
  - Supports address -> COSMO ID resolution if the ID has been logged
- Indexing of all released objekts
- Wishlist builder
- COMO drop calendar
- Polygon gas price display
- Displaying trade history
  - Includes displaying COSMO ID if available
- Privacy options to hide collection/trades/COMO
- Per-member collection progress breakdown
  - Leaderboards displaying the top 25 users for the given member
- Toggle to display collections from the blockchain instead of COSMO
- Descriptions/source of all objekts
- Pinning objekts to the top of your collection

</details>

<details>
  <summary><b>Out of Scope</b></summary>
  
  - Social login (Google etc): Ramper has repeatedly blocked usage of its SDK.
  - Account registration: There's too much that goes into the onboarding process, not worth the effort.
  - Account settings: There's not enough in there to adjust right now.
  - Purchasing objekts: Apple/Google services are used.
  - Gravity voting: Maybe if the transaction calldata is figured out.
</details>

### Notes

- **There's no app version or user agent spoofing. It's entirely possible for MODHAUS to detect usage of this. Use at your own risk.**
- Only the happy path is tested extensively. Any error handling is mostly just HTTP retries and React error boundaries with a page refresh button.
- Anything in `/scripts` are mostly just one-offs to migrate production data. They're not meant to be run again.

## Requirements

- [Node.js](https://nodejs.org/en/) 18.17+
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

- [Next 14](https://nextjs.org/)
  - [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
  - [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Tailwind](https://tailwindcss.com/)
- [Neon](https://neon.tech/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Alchemy](https://www.alchemy.com/)

## License

Licensed under the [MIT license](https://github.com/teamreflex/cosmo-web/blob/main/LICENSE.md).

## Contact

- **Email**: kyle at reflex.lol
- **Discord**: kairunz
- **Cosmo ID**: Kairu
