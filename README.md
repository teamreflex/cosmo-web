# cosmo-web

This project aims to build a web based version of [Modhaus](https://www.mod-haus.com/)' **[Cosmo: the Gate](https://play.google.com/store/apps/details?id=com.modhaus.cosmo)** mobile application, replicate its core features as close as possible, and add new features on top.

<details>
  <summary><b>Scope</b></summary>
  
  - Account registration is out of scope. There's too much that goes into the onboarding process, not worth the effort.
  - Account settings updates are out of scope. There's not enough in there to adjust right now.
  - Purchasing objekts is out of scope due to Apple/Google services being used.
</details>

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
  - Cosmo ID or Polygon address can be used
  - Filter state is stored in the URL for sharing
- Indexing of all released objekts
- Wishlist builder
- COMO drop calendar

</details>

### Notes

- **There's no app version or user agent spoofing. It's entirely possible for Modhaus to detect usage of this. Use at your own risk.**
- Only the "happy path" is tested extensively. There isn't a lot of good error handling.

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
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)
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
