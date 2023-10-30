### Auth

- Test Cosmo token refreshing.

### Grid

- Look into grid submission recovery
  - eg: `/complete` succeeds but `/claim-reward` fails. Reward claiming needs to be resumable.

### Gravity

- ~~Implement voting~~
- Implement combination poll display
- Clean up poll result display for multi-poll gravities

### Collection

- Fix filters wrapping under member filter
- Look into marking objekts as "up for trade" or go all-in on a WTT system
  - would probably require indexing all possible objekts
- Wishlist creator tool?
- Expand on public collections/profiles
  - eg: set a favorite objekt? favorite member?
  - private profile is probably useless due to other tools
- Como calendar?
  - might require indexing to be efficient
- Consider using Alchemy NFT activity webhooks to delete locked objekts upon transfer

### General

- Fix searchbox blur
