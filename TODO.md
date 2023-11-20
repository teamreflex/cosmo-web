## Bugs

- Fix searchbox blur
- Fix `useContext` error
  - might be local-only?

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

- Switch pg details over to new server once it's done indexing
- Implement day calculation based on transfers
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
