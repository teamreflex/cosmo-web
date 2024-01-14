## Issues

- User searchbox has blurred text
- Collections search/dropdown has keyboard controls which makes the searchbox a little jank
- `<FilteredObjektDisplay>` should be virtualized
- Grid slot selector doesn't have locked tokens filter

### Gravity

- Remove voting modal, show options inline
- Implement combination poll display
- Clean up poll result display for multi-poll gravities

### Objekts Index

- Add serial/ownership lookup/details
  - intercepting route usecase?
  - come up with a good UI beforehand

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

### Trades / PolygonScan replacement

- Add filtering
- Add transfer hash

### Stats / OpenSea replacement

- Come up with a UI design first

### Profiles

- Set a favorite objekt?
- Set a favorite member?
- Social links? Twitter, Discord, Instagram etc
