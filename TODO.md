## Bugs

- Fix searchbox blur
- Fix collections search/dropdown jank
- Fix tooltip issue on navbar search
- Fix objekt/collection total count not updating
  - happens when swapping to an already loaded filter

## General

- Improve loading skeletons
- Move any caching from Vercel KV to `unstable_cache`

### Grid

- Look into grid submission recovery
  - eg: `/complete` succeeds but `/claim-reward` fails. Reward claiming needs to be resumable.
- Prevent submission when there's missing slots (API issue already reported to Modhaus)
- When fetching objekts to slot, filter out anything that is locked

### Gravity

- Remove voting modal, show options inline
- Implement combination poll display
- Clean up poll result display for multi-poll gravities

### Objekts Index

- Add serial/ownership lookup/details
  - intercepting route usecase?

### Collection

- Delete locked objekts upon transfer
  - either use Alchemy webhooks or setup a webhook for the indexer to post to
- Add a toggle to switch between Cosmo and blockchain as the data source

### COMO Calendar

- Handle instances where a drop occurs on the 31st, in a month with <31 days

### Trades

- Add filtering

### Profiles

- Set a favorite objekt?
- Set a favorite member?
- Social links? Twitter, Discord, Instagram etc
- Add proper profile header/info block
