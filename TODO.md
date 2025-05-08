### objekt search - deployed 250506

- [x] setup typesense container
- [x] write data import server
- [x] refactor import server to use effect
- [x] setup ssl
- [x] harden server

### cosmo data

- [x] check if app refreshes access token
  - **250506**: it doesn't
- [x] check if the old token refresh endpoint works
  - **250508**: it does
- [ ] restore `withProxiedToken` for persistent access
- [ ] restore user search w/ caching
- [ ] restore gravity importing
- [ ] refactor polygon gravity tracking to abstract

### admin

- [ ] restore admin panel for metadata insertion
- [ ] allow for typesense synonym updates?

### profiles table refactor

- [ ] rename table from `profiles` to something like `cosmo_accounts`
- [ ] rename `user_address` to `address`
- [ ] rename `nickname` to `username`
- [ ] remove `artist`, `privacyVotes`, `gridColumns`, `objektEditor`, `dataSource`, `isModhaus` as these have been moved to the local account

### public profiles

- [ ] decide on a strategy for which accounts to publicly display

  - [ ] local accounts: will result in confusion due to a year+ of cosmo id usage
    - cosmo verification would display that wallet's data
    - should allow for data migration
    - would need to figure out local username <-> cosmo id conflicts
  - [ ] cosmo ids: transition would be seamless
    - cosmo verification would allow users to "claim" pre-existing `cosmo_accounts` rows
    - lists would still need to be migrated due to being linked to the user (can be done automatically upon link)
    - pins and locked objekts could remain using addresses as foreign keys?

### cosmo account verification

- [ ] check if playwright works on vercel fluid
  - option: https://github.com/Sparticuz/chromium
  - option: browserless cloud (free tier: 1k units @ 30s exec. time each)
  - option: browserless docker (free, risk ip block)
- [ ] ensure the recaptcha bypass still works
- [ ] api routes or build a better-auth plugin?
- [ ] link to signed in user

### user data migration (if using local accounts as the base)

- [ ] rename old tables: `lists`, `list_entries`, `pins`, `locked_objekts`
- [ ] create new tables for pins and locked objekts
- [ ] allow users to migrate their data to the new tables
