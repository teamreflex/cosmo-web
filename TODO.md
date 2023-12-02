## Bugs

- Fix searchbox blur
- Fix `useContext` error
  - might be local-only?
- Fix collections search/dropdown jank

## General

- Improve loading skeletons

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
- Add caching
  - `unstable_cache` + webhook for invalidation? redis?

### Collection

- Delete locked objekts upon transfer
  - either use Alchemy webhooks or setup a webhook for the indexer to post to

### COMO Calendar

- Handle instances where a drop occurs on the 31st, in a month with <31 days

### Profiles

- Set a favorite objekt?
- Set a favorite member?
