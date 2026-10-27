# Accounts

An Apollo account is a Better Auth user ([`auth.md`](auth.md)) that may link one COSMO account by proving control of its bio. This file covers links, what others may see of a user, how staff name users, and account deletion.

## COSMO links

### Invariants

- A user links at most one COSMO account, and a COSMO account belongs to at most one user. `cosmo_account.address` is unique, and `user_id` has a unique index (NULLS DISTINCT, so unlinked rows don't collide).
- `cosmo_account.user_id` has no foreign key to `user`. Deleting a user doesn't unlink the address; `purgeAccount()` does it explicitly.
- `cosmo_account` doubles as a cache of COSMO profiles: `cacheAccounts()` upserts unlinked rows from profile lookups and search results.
- Users can't unlink, and a link never moves between users; only account deletion unlinks. Someone who lost access to the Apollo account holding their COSMO account asks staff to delete that account, then links the address to their new account through the bio.
- An address held by a banned account stays with it, because a banned user can't delete their account.
- Received feedback is keyed by COSMO address, not by user. Relinking the same COSMO account to a new Apollo account brings its rating history back, negatives included.

### Link history

- `cosmo_link_audit` is append-only, with a row for every link and unlink. It is the only trail from a COSMO account to every Apollo account that has held it.
- Every change to `cosmo_account.user_id` appends its rows through `recordCosmoLinkChanges()` in the same transaction.
- `event` and `reason` are pg enums, and a check constraint pairs `verified` with `linked` and `account-deleted` with `unlinked`. A new way to change a link needs a new reason, which means a migration for the enum value and the constraint.
- Admins read the history on `/admin/accounts` (`cosmo: history`).

### Verification flow

The first check is advisory; the checks after the bio check are authoritative, and the conditional upsert backstops races between them.

```
  link wizard                  apps/web                           Redis / COSMO
  -----------                  --------                           -------------
  pick artist, search COSMO
  $generateVerificationCode -> caller linked?   -> cosmo_already_linked
   {cosmo userId, artistId,    address held?    -> account_linked_elsewhere
    address}                     (a ban is never revealed here)
                               storeVerification ---------------> cosmo:verify:{uid}
                  <-- code --                                     5 min TTL
  user puts code in the bio
  $verifyCosmoBio {code} ----> no stored code -> EXPIRED, mismatch -> INVALID
                               fetchUserProfile(stored COSMO user id) -> COSMO API
                               bio lacks code (any case) -> NOT_FOUND
                               linkVerifiedAccount, one transaction:
                                 lock the caller's user row FOR SHARE
                                 cosmoLinkRefusal(owner)
                                   -> cosmo_account_banned | account_linked_elsewhere
                                 upsert cosmo_account WHERE user_id IS NULL
                                 cosmo_link_audit (linked, verified)
                                 importObjektLists (the address's legacy lists)
                               clearVerification ---------------> DEL
  router.invalidate() <- ok -
```

- The linked address is `profile.address` from COSMO. The client's `address` is used only for the advisory check.
- The profile is fetched through the dummy account's token ([`packages/cosmo/README.md`](../packages/cosmo/README.md#credentials)).
- A ban is revealed (`cosmo_account_banned`) only after the bio check, to someone who has proven control of the account. Every earlier refusal says `account_linked_elsewhere`.
- An upsert that loses a race refuses with `cosmo_already_linked` or `account_linked_elsewhere`, and a unique violation on `user_id` maps to `cosmo_already_linked`.
- The client calls `router.invalidate()` after linking, because the link is root-loader data.

### Reading a link

- Read a user's address with `getCosmoAddress(executor, userId)`, or through the user's `cosmoAccount` relation when the query already loads the user row.
- The address keeps the case it was stored with. The column is citext, and the client compares it with `===` against profile addresses.
- Compare it with lowercase indexer rows through `isEqual()` or `addr()`.

## Public users

`PublicUser` is what other people may see of a user. It is brand-typed; build it with `toPublicUser()` (`lib/server/auth.server.ts`).

- It leaves out the email, the role and the display currency. Discord and X names are included only when `showSocials` is on.
- The viewer's own account goes through `toCurrentUser()`, which adds the currency. The role travels separately on `GetAccount`.
- Load user rows with a relational query (`db.query.user`, or `cosmoAccounts` with `with: { user: true }`), then map each through `toPublicUser()`.
- Don't select `discord` or `twitter` in an aggregating query or CTE, and don't hand-roll a SQL mask for them. Fetch the user rows in a separate relational query after the aggregation, so the `showSocials` rule stays in `toPublicUser()`.

## Staff names

- Staff surfaces name a user by their COSMO username, their public identity, through `staffUser()` (`lib/server/staff-users.server.ts`). A user without a link falls back to their Apollo username.
- `StaffUserName` tags an Apollo name "No COSMO", because the two namespaces can overlap. Text-only places use `staffUserText()`, which puts `@` before COSMO names.
- Where a user's current COSMO account may not be the one a row describes, such as the link history, staff see `apolloUsername()` instead.
- `staffUser(null)` is a deleted user, shown as "Deleted user". Pages built from COSMO and chain data keep showing the COSMO username, which belongs to the COSMO account.

## Account deletion

`$deleteAccount` (`lib/functions/account.ts`) is the only way to delete an account; Better Auth's `deleteUser` isn't enabled.

```
  Delete dialog                      apps/web
  -------------                      --------
  $checkAccountDeletion -------->  blockers (live trades)  -> blocked, listed
                                   deliverable email       -> "send-email"
                                   session < 10 min old    -> "delete"
                                   otherwise               -> "sign-in-again"

  "send-email"
  $requestAccountDeletion ------>  3 per hour; blockers again
                                   new token (24 h), the user's older tokens deleted
                                   email /auth/delete-account?token=...
  page button POSTs the token --+  (opening the link alone deletes nothing)
  "delete": fresh-session proof +
                                v
           +-- deleteAccount(), one transaction ------------------------------+
           | lock the user row FOR UPDATE                                     |
           | ban active?           -> account_deletion_banned                 |
           | blockers?             -> blocked, token kept                     |
           | proof fits the step?  consume the token                          |
           | purgeAccount: unlink COSMO + link history row,                   |
           |   delete the address's pins, locked objekts and legacy lists,    |
           |   closeOpenOffers(by: "deletion"), delete verification rows,     |
           |   delete the user row (foreign keys cascade or set null)         |
           +------------------------------------------------------------------+
           after commit: clear the pin cache, clear the link code, disconnect
```

- A deletion proof (`DeletionProof`) is either the token from the emailed link or, only for an account without a deliverable email ([`auth.md`](auth.md#social-sign-in-can-change-the-email)), a session created less than 10 minutes ago.
- Freshness counts from `session.created_at`, so refreshing a session doesn't renew it.
- The emailed link opens a page that deletes only when its button POSTs the token, so mail link scanners and restored tabs can't delete an account.
- An actively banned user can't delete their account, because deleting frees the COSMO address for a fresh account. The check runs under the row lock, which a ban waits on, so a ban that lands after the email went out still refuses.
- What a deletion does to listings, offers and trades is in [`trades/lifecycle.md`](trades/lifecycle.md).
- Ratings outlive both parties: `trade_feedback.from_user_id` and `to_user_id` are `SET NULL`, and the address's `user_feedback_stats` row stays.
- `/api/og/profile/*` responses carry 24-hour cache headers, so a card showing the deleted user's pins can outlive the deletion until they expire.

### Foreign keys to user

- Every foreign key to `user.id` is `ON DELETE CASCADE` or `SET NULL`, so the delete can't fail on a leftover reference.
- A new table that references a user picks one of those. If its rows must outlive the user, it keeps a plain id with no foreign key ([`database.md`](database.md)).

### Adding a blocker

1. Append a check to `blockerChecks` in `lib/server/account-deletion.server.ts`. Checks run in order and can share the caller's transaction.
2. Extend the `DeletionBlocker` union in `lib/universal/account-deletion.ts`, then fix `deletionBlockerCount()` and the dialog rows the type checker points at.

Blocked results are returned, not thrown, so the UI can list every blocker.
