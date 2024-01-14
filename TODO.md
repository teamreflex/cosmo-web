## Issues

- User searchbox has blurred text
- Collections search/dropdown has keyboard controls which makes the searchbox a little jank
- `<FilteredObjektDisplay>` should be virtualized
- Grid slot selector doesn't have locked tokens filter

### General

- Move project to a monorepo, move indexer into here

### Gravity

- Remove voting modal, show options inline
- Implement combination poll display
- Clean up poll result display for multi-poll gravities

### Objekts Index

- Add serial/ownership lookup/details
  - intercepting route usecase?
  - come up with a good UI beforehand

### Collection

- Delete locked objekts upon transfer
  - either use Alchemy webhooks or setup a webhook for the indexer to post to
- Refactor locking into "marking" objekts as different colors/statuses/icons/idk
  - locking doesn't really make sense when sending is disabled

### Trades / PolygonScan replacement

- Add filtering
- Add transfer hash

### Stats / OpenSea replacement

- Come up with a UI design first

### Profiles

- Set a favorite objekt?
- Set a favorite member?
- Social links? Twitter, Discord, Instagram etc
- Custom profile image?
