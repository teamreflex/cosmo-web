# cosmo-web (Apollo)

This project aims to build a web based version of [Modhaus](https://www.mod-haus.com/)' **[Cosmo: the Gate](https://play.google.com/store/apps/details?id=com.modhaus.cosmo)** mobile application, replicate its core features as close as possible, and add new features on top.

<details>
  <summary><b>Replicated Features</b></summary>

- Authentication
  - Sign in with Ramper
  - Cosmo user/token fetching
  - Token refreshing
  - Sign out
  - "My Page" displaying Cosmo ID and wallet address
- Objekts/COMO
  - Fetching owned objekts
  - Sending objekts to another Cosmo user
  - Displaying reason for untransferable objekts - e.g. used for grid vs. not transferrable (event, welcome) vs. pending mint
  - All available filters
  - Display COMO balances
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
  - Displaying "today's atmosphere" and "Cosmo exclusive" feeds
  - Inline playback of exclusive m3u8 streams (broken on iOS due to HLS)
- Gravity
  - Displaying list of gravity events
  - Render dynamic gravity event description
  - Display details about a specific gravity event (ranking, leaderboard etc)

</details>

<details>
  <summary><b>New Features</b></summary>

- "lock" an objekt to prevent it from being sent to another user (like the Superstar games)
- Fetching other user's collections
  - Includes user search box with recent history
  - Filter state is stored in the URL for sharing
  - Cosmo ID or Polygon address can be used
  - Supports address -> Cosmo ID resolution if the ID has been logged
- Indexing of all released objekts
- Wishlist builder
- COMO drop calendar
- Polygon gas price display
- Displaying trade history
  - Includes displaying Cosmo ID if available
- Privacy options to hide collection/trades/COMO
- Collection progress counter

</details>

<details>
  <summary><b>Out of Scope</b></summary>
  
  - Account registration. There's too much that goes into the onboarding process, not worth the effort.
  - Account settings. There's not enough in there to adjust right now.
  - Purchasing objekts. Apple/Google services are used.
  - Gravity voting. Maybe if the transaction calldata is figured out.
</details>

### Notes

- **There's no app version or user agent spoofing. It's entirely possible for Modhaus to detect usage of this. Use at your own risk.**
- Only the "happy path" is tested extensively. There isn't a lot of good error handling.

## Requirements

- [Node.js](https://nodejs.org/en/) 18.17+
- [PlanetScale](https://planetscale.com/) instance
  - Or swap this out for another MySQL compatible database with minimal code changes
- Postgres instance
  - The accompanying [blockchain indexer](https://github.com/teamreflex/cosmo-db) has containerized Postgres 15.5. Migration files can also be found there
- [Alchemy](https://www.alchemy.com/) API key

## Setup

```bash
$ git clone git@github.com:teamreflex/cosmo-web.git
$ cd cosmo-web
$ pnpm install
$ cp .env.example .env.local
$ pnpm db:push
$ pnpm dev
```

## Tooling

- [Nextjs](https://nextjs.org/)
  - [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
  - [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)
- [Ramper SDK](https://www.ramper.xyz/)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Tailwind](https://tailwindcss.com/)
- [PlanetScale](https://planetscale.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Fathom Analytics](https://usefathom.com/)
- [Alchemy](https://www.alchemy.com/)

## License

Licensed under the [MIT license](https://github.com/teamreflex/cosmo-web/blob/main/LICENSE.md).

## Contact

- **Email**: kyle at reflex.lol
- **Discord**: kairunz
- **Cosmo ID**: Kairu
