### Grid

- Look into grid submission recovery
  - eg: `/complete` succeeds but `/claim-reward` fails. Reward claiming needs to be resumable.
- Prevent submission when there's missing slots (API issue already reported to Modhaus)
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
- Look into why my `gridable` filter is broken on 2nd edition Heejin/Haseul

### General

- Fix searchbox blur
- Extract types from functions so they can be used on the frontend without `server-only` getting in the way

### Performance

- Maybe remove barrel files so webpack doesn't suck
- Consider replacing `loading.tsx` with `<Suspense>` where applicable
