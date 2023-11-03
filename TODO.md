### Grid

- Look into grid submission recovery
  - eg: `/complete` succeeds but `/claim-reward` fails. Reward claiming needs to be resumable.
- Prevent submission when there's missing slots (API issue already reported to Modhaus)
- Fix wording so it's not 1:1 with Cosmo
- Adjust design so it suits desktop displays rather than copying the mobile design
- When fetching objekts to slot, filter out anything that is locked

### Gravity

- Remove voting modal, show options inline
- Implement combination poll display
- Clean up poll result display for multi-poll gravities

### Collection

- Fix filters wrapping under member filter
- Look into marking objekts as "up for trade" or go all-in on a WTT system
  - would probably require indexing all possible objekts
- Wishlist creator tool?
- Expand on public collections/profiles
  - eg: set a favorite objekt? favorite member? profile picture?
  - private profile is probably useless due to other tools
- Como calendar
  - might require indexing to be efficient
- Consider using Alchemy NFT activity webhooks to delete locked objekts upon transfer
- Add edition filter
  - fetching current editions requires auth, probably requires hardcoding to be reliable
- Look into indexing now Alchemy Subgraphs are in GA

### General

- Fix searchbox blur
- Extract types from functions so they can be used on the frontend without `server-only` getting in the way

### Performance

- Maybe remove barrel files so webpack doesn't suck
- Consider replacing `loading.tsx` with `<Suspense>` where applicable
- Directly query Cosmo for anything that doesn't require auth, to cut down on resource usage (redis, edge functions)
  - Public collections
  - All artists (without members)
  - Individual artist (with members)
