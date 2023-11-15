### Grid

- Look into grid submission recovery
  - eg: `/complete` succeeds but `/claim-reward` fails. Reward claiming needs to be resumable.
- Prevent submission when there's missing slots (API issue already reported to Modhaus)
- When fetching objekts to slot, filter out anything that is locked
- Add loading state to each objekt image

### Gravity

- Remove voting modal, show options inline
- Implement combination poll display
- Clean up poll result display for multi-poll gravities

### Collection

- Look into marking objekts as "up for trade" or go all-in on a WTT system
  - would probably require indexing all possible objekts
- Wishlist creator tool?
- Expand on public collections/profiles
  - eg: set a favorite objekt? favorite member? profile picture?
  - private profile is probably useless due to other tools
- Consider using Alchemy NFT activity webhooks to delete locked objekts upon transfer

### General

- Fix searchbox blur
