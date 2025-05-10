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
- [x] restore `withProxiedToken` for persistent access
- [x] restore user search w/ caching
- [ ] restore gravity importing
- [ ] refactor polygon gravity tracking to abstract

### admin

- [ ] restore admin panel for metadata insertion
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

### server action client migration

- [x] objekt lock
- [x] objekt pin
- [x] objekt unpin
- [x] metadata update
- [x] metadata bulk update (admin)

### user data migration

- [ ] decide whether or not to start objekt lists new or keep the existing table
- [ ] if new, build migration tool
- [ ] if existing, update `user_address` column name & drop "new" tables

### polish

- [x] add toggle locked filter back
- [x] fix jank around redirecting away when finishing cosmo link
- [ ] add oauth linking after register for email & password users
- [x] remove abstract gas indicator
- [ ] fix settings save not triggering update (move into separate user state provider/hook?)

### stretch

- [ ] allow unlinking of cosmo accounts
- [ ] display discord handle on profile
- [ ] double check how betterauth handles oauth -> username mapping w/ conflicts
- [ ] contingency backup for browserless failing
- [ ] refactor artist/member filtering

### optimization

- [ ] copy cosmo data into user table for easier querying?

```sql
CREATE OR REPLACE FUNCTION update_user_from_cosmo_account()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "user"
    SET cosmo_username = NEW.username,
        cosmo_address = NEW.address
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_from_cosmo_account
AFTER INSERT OR UPDATE ON cosmo_account
FOR EACH ROW
EXECUTE FUNCTION update_user_from_cosmo_account();
```
