### objekt search - deployed 250506

- [x] setup typesense container
- [x] write data import server
- [x] refactor import server to use effect
- [x] setup ssl
- [x] harden server

### cosmo data - done 250512

- [x] check if app refreshes access token
  - **250506**: it doesn't
- [x] check if the old token refresh endpoint works
  - **250508**: it does
- [x] restore `withProxiedToken` for persistent access
- [x] restore user search w/ caching
- [x] restore gravity importing

### admin

- [x] restore admin panel for metadata insertion
- [ ] allow for typesense synonym updates?

### profiles table refactor - done 250508

- [x] rename table from `profiles` to something like `cosmo_accounts`
- [x] rename `user_address` to `address`
- [x] rename `nickname` to `username`
- [x] remove `artist`, `privacyVotes`, `gridColumns`, `objektEditor`, `dataSource`, `isModhaus` as these have been moved to the local account
- [x] make `cosmoId` nullable

### public profiles - done 250508

- [x] decide on a strategy for which accounts to publicly display

  - [ ] local accounts: will result in confusion due to a year+ of cosmo id usage
    - cosmo verification would display that wallet's data
    - should allow for data migration
    - would need to figure out local username <-> cosmo id conflicts
  - [x] cosmo ids: transition would be seamless
    - cosmo verification would allow users to "claim" pre-existing `cosmo_accounts` rows
    - lists would still need to be migrated due to being linked to the user (can be done automatically upon link)
    - pins and locked objekts could remain using addresses as foreign keys?
    - [x] refactor profile loading back to exclusively cosmo accounts

### cosmo account verification - done 250508

- [x] check if playwright works on vercel fluid
  - option: https://github.com/Sparticuz/chromium
  - option: browserless cloud (free tier: 1k units @ 30s exec. time each)
  - option: browserless docker (free, risk ip block)
  - [x] **250508**: using browserless cloud + bql
- [x] ensure the recaptcha bypass still works
  - **250508**: switched to invoking the lib directly: https://developers.google.com/recaptcha/docs/v3#programmatically_invoke_the_challenge
- [x] api routes or build a better-auth plugin?
  - **250508**: api routes + server action
- [x] link to signed in user

### server action client migration - done 250510

- [x] objekt lock
- [x] objekt pin
- [x] objekt unpin
- [x] metadata update
- [x] metadata bulk update (admin)

### user data migration - done 250512

- [x] decide whether or not to start objekt lists new or keep the existing table
- [x] if new, build migration tool
  - **250512**: automatic import on cosmo link

### polish - done 250511

- [x] add toggle locked filter back
- [x] fix jank around redirecting away when finishing cosmo link
- [x] add oauth linking after register for email & password users
- [x] remove abstract gas indicator
- [x] fix settings save not triggering update (move into separate user state provider/hook?)
- [x] use controlled inputs to work around react 19 resetting forms

### gravity tracking migration

- [x] move client code
- [x] update governor abi
- [x] migrate components
- [x] migrate hooks to new contracts
- [x] implement gravity listing
- [x] port historical polygon data fetching to the server and cache it
- [x] re-implement polygon display
- [x] migrate polygon voter data, will require polygon->abstract address migration
- [ ] polish individual gravity pages

### stretch

- [ ] allow unlinking of cosmo accounts
- [x] display discord handle on profile
- [x] double check how betterauth handles oauth -> username mapping w/ conflicts
- [ ] contingency backup for browserless failing
- [ ] refactor artist/member filtering
- [x] implement objektlist usage without cosmo signin

### optimization

- [x] solve better-auth db waterfall on `getSession`

### bugs

- [x] navbar/auth suspense fallback misaligned on desktop
- [x] gravity index crashes when no artists are selected
- [x] link cosmo dialog opens/shows when signed out
- [x] fix sign in form overflowing on mobile
- [x] fix password reset page

### production

- [x] wipe prod gravities, gravity_polls, gravity_poll_candidates tables
- [x] merge and deploy so database gets migrated
- [x] trigger gravity cron
- [x] run polygon address migrator
- [x] run voter data migrator
- [x] once stabilized, run objekt receivedAt migrator
