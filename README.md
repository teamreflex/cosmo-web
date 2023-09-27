# cosmo-web

This project aims to build a web based version of [Modhaus](https://www.mod-haus.com/)' **[Cosmo: the Gate](https://play.google.com/store/apps/details?id=com.modhaus.cosmo)** mobile application, replicate its core features as close as possible, and add new features on top.

### Scope

- Account registration is out of scope. There's too much that goes into the onboarding process, not worth the effort.
- Account settings updates are out of scope. There's not enough in there to adjust right now.
- Purchasing objekts is out of scope due to Apple/Google services being used.
- Gridding objekts is out of scope. May revisit this when new editions drop and I have a better understanding of how it works.
- Complete objekt library and viewing other users are both out of scope. Other tools already exist.

### Replicated Features

- Authentication
  - Sign in with Ramper
  - Cosmo user/token fetching
  - Sign out
  - "My Page" displaying Cosmo ID and wallet address
- Objekts/COMO
  - Fetching owned objekts (paginated)
  - Sending objekts to another Cosmo user
  - Displaying reason for untransferable objekts - e.g. gridded vs. not transferrable (event, welcome)
  - All available filters
  - Display COMO balances (via Alchemy due to Cosmo's being outdated)
- Artist
  - Fetching artist information
  - Artist switching (homepage defaults to selected)
- News
  - Displaying news feed

### New Features

- Objekts
  - "lock" an objekt to prevent it from being sent to another user (like the Superstar games)

### Notes

- **There's no app version or user agent spoofing. It's entirely possible for Modhaus to detect usage of this. Use at your own risk.**
- Authentication can be fragile as there's two separate states. The process requires using the Ramper SDK to get the Ramper user, then use the received `idToken` to log into Cosmo. The Ramper user is stored by the SDK in localStorage, whereas the Cosmo user is encoded into a cookie by the application. If either one of these expires/invalidates, the other will not be and this will possibly result in a broken auth state.

## Setup

```bash
$ git clone git@github.com:teamreflex/cosmo-web.git
$ cd cosmo-web
$ pnpm install
$ pnpm dev
```

## Tooling

- [Next 13](https://nextjs.org/)
  - [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
  - [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)
- [Ramper SDK](https://www.ramper.xyz/)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Tailwind](https://tailwindcss.com/)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)

## License

Licensed under the [MIT license](https://github.com/teamreflex/cosmo-web/blob/main/LICENSE.md).

## Contact

- **Email**: kyle at reflex.lol
- **Discord**: kairunz
- **Cosmo ID**: Kairu
