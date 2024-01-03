## Bugs

- User searchbox has blurred text
- Collections search/dropdown has keyboard controls which makes the searchbox a little jank

## General

- Iron out any remaining jank/issues from performance refactoring

## Performance

- Prevent all Objekt components from rerendering upon a single objekt being locked
- Virtualize the list of objekts

### Grid

- When fetching objekts to slot, filter out anything that is locked

### Gravity

- Remove voting modal, show options inline
- Implement combination poll display
- Clean up poll result display for multi-poll gravities

### Objekts Index

- Add serial/ownership lookup/details
  - intercepting route usecase?

### Collection

- Add grid size options
- Delete locked objekts upon transfer
  - either use Alchemy webhooks or setup a webhook for the indexer to post to
- Finish blockchain data source switch:
  - add toggle on frontend: maybe add to profiles as a default?
  - properly implement transferable & gridable filters
  - add transferability to indexer
    - will require a rehydrate of the indexer
    - will require migration of existing objekt list entries

### Trades

- Add filtering

### Profiles

- Set a favorite objekt?
- Set a favorite member?
- Social links? Twitter, Discord, Instagram etc
