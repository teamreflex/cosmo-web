### Grid

- Look into grid submission recovery
  - eg: `/complete` succeeds but `/claim-reward` fails. Reward claiming needs to be resumable.
- Prevent submission when there's missing slots (API issue already reported to Modhaus)
- When fetching objekts to slot, filter out anything that is locked

### Gravity

- Remove voting modal, show options inline
- Implement combination poll display
- Clean up poll result display for multi-poll gravities

### COMO Calendar

- Redo indexer to save transfers rather than calculate based on the day of the month
  - incr/decr based on the day doesn't work due to UTC/timezone differences
  - saving all transfers and letting the client calculate it probably works better
- Experiment with UI design for it
  - leading candidate: Tailwind UI's calendar component

### Objekts Index

- Add edition/collectionNo filters
  - should probably add a generated column for this on the indexer side
- Add caching
  - `unstable_cache` + webhook for invalidation? redis?

### Collection

- Delete locked objekts upon transfer
  - either use Alchemy webhooks or setup a webhook for the indexer to post to
- Connect to websocket to detect transaction success/failure

### Profiles

- Set a favorite objekt?
- Set a favorite member?

### Bugs

- Fix searchbox blur
- Fix `useContext` error (might be local-only?)
- Fix "Kairu.prefetch's Collection" error when routing from list to profile
  - actual TODO: add refetching back once the bug is fixed
