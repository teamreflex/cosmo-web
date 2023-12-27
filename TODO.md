## Bugs

- User searchbox has blurred text
- Collections search/dropdown has keyboard controls which makes the searchbox a little jank
- Get tooltip working on the search icon in navbar
- Get tooltip working on the objekt list button

## General

- Improve loading skeletons
- Move any caching from Vercel KV to `unstable_cache`
- Refactor `CollectionRenderer` and `ProfileRenderer` into just one component
- Iron out any remaining jank/issues from performance refactoring

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

- Delete locked objekts upon transfer
  - either use Alchemy webhooks or setup a webhook for the indexer to post to
- Add a toggle to switch between Cosmo and blockchain as the data source
  - would bring better filtering like jinsoultv
- Add grid size options

### COMO Calendar

- Handle instances where a drop occurs on the 31st, in a month with <31 days

### Trades

- Add filtering

### Profiles

- Set a favorite objekt?
- Set a favorite member?
- Social links? Twitter, Discord, Instagram etc
