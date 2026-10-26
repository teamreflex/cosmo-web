# Lock order

Every web-database transaction that locks more than one kind of row takes them in the order below, because two transactions locking the same rows in opposite orders deadlock and Postgres aborts one with `40P01`.

## The order

```
  0  list_drain_cursor    schedules only: drain-outbox FOR UPDATE, trade-timers FOR SHARE
         |                (web reads it without a lock)
         v
  1  user rows            one statement, ORDER BY id, strength per writer (table below)
         |                web: lockParties()   schedules: lockUsers()
         v
  2  cosmo_account        written only by linking and account deletion; trade writes
         |                read the link in a second statement (readLockedLinks())
         v
  3  trade rows           live trades, then pending offers, ORDER BY id
         |
         v
  4  listing rows         ORDER BY id, in a statement of their own
         |
         v
  5  trade_feedback  ->  user_feedback_stats   (one upsert, addFeedbackStats())
```

A writer skips the steps it doesn't touch. A claim, for example, locks users, then the listing, and inserts its trade.

## Why users come first

- Account deletion locks the user `FOR UPDATE`, then writes their `cosmo_account`, offers and listings.
- Every insert that names a user through a foreign key, a notification above all, takes `FOR KEY SHARE` on that user.
- A writer that locked a trade or listing before its users would wait on a deletion that is waiting on it.
- So a writer's first statement locks every user it may check or notify. A user whose row is gone by then is refused, or skipped as a recipient.

## User lock strength

| Strength            | Blocks                            | Taken by                                                                                             | Why                                                                                                      |
| ------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `FOR UPDATE`        | every other strength              | account deletion, deletion-link request                                                              | nothing may touch the user until the row is gone or the token replaced                                   |
| `FOR NO KEY UPDATE` | itself, `FOR SHARE`, `FOR UPDATE` | ban, set role, claim, offer on a listing, direct offer, counter, accept                              | serialises one user's parallel claims (the claim cap) and blocks linking until commit                    |
| `FOR SHARE`         | `FOR NO KEY UPDATE`, `FOR UPDATE` | COSMO link, listing post, edit and withdraw, party actions on an existing trade, staff trade actions | keeps a ban or deletion from landing halfway, without serialising these writes against each other        |
| `FOR KEY SHARE`     | `FOR UPDATE`                      | drain-outbox, trade-timers, chat Send                                                                | only needs the row to outlive the notifications' foreign keys, so it never waits on a party's own action |

## Rules

- Lock each kind of row with one `SELECT ... ORDER BY id FOR ...` before its guarded update, because a multi-row `UPDATE` locks rows in scan order.
- Lock trade rows and listing rows in separate statements, trades first. Both kinds live in `trade_offers`, so one statement would lock them in id order across kinds.
- Read a COSMO link after the user lock, in a statement of its own (`readLockedLinks()`). A lock that waited on a relink re-reads only the locked row, so a link joined into the locking statement would be the one from before the wait.
- A write that ends a listing's pending offers locks them before the listing. Edit and withdraw read the offers first (`listingOffers()`), lock their claimers with the poster, then the offers (`lockListingOffers()`), then the listing.
- An edit re-reads the offers under the listing's lock and refuses with `listing_updated` if one appeared. A withdrawal leaves that offer to trade-timers ([docs/trades/listings.md](trades/listings.md#posting-editing-withdrawing)).
- A write that closes a listing without holding its offers (`closeSpentListings`, after a trade ends or the drain drops a pool token) never ends them. trade-timers declines them later ([docs/trades/lifecycle.md](trades/lifecycle.md#timers-decisions)), locking users then offers and never the listing, because a listing never reopens.
- Every writer of a trade's timeline (`trade_messages`) holds that trade's row first, by locking it `FOR NO KEY UPDATE` or by having inserted it. Message ids then commit in order, so a chat stream reading past its last id never skips one ([apps/chat/README.md](../apps/chat/README.md)).
- trade-timers' deadline pass locks the cursor `FOR SHARE`, so it waits for a drain batch in flight and judges deadlines against a watermark whose transfers are all recorded ([apps/schedules/CLAUDE.md](../apps/schedules/CLAUDE.md)).

## The ban's two batches

`banAndSweep()` (`apps/web/src/lib/server/staff-users.server.ts`) can't know every user to lock before it holds the banned user's row.

1. Read the user's accepted trades and the pending offers sent to them, without a lock.
2. Lock the user and every counterparty found, `FOR NO KEY UPDATE`, in one statement.
3. Read them again. Counterparties of a trade or offer that committed while the ban waited are locked in a second statement.
4. Lock the accepted trades one at a time in id order, then `closeOpenOffers()` locks the pending offers, then the open listings.

Step 3 is the one place users are locked outside id order. Its users can only come from writes that committed during the wait, because nothing new with the banned user can commit before the ban does. If one of them is meanwhile mid-write with the banned user, Postgres aborts one of the two transactions with `40P01`.

## Who follows it

Web paths are under `apps/web/src/lib/`.

| Writer                         | Code                                                            | Users                                                     | Then                                                                                              |
| ------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Account deletion               | `deleteAccount()`, `server/account-deletion.server.ts`          | `FOR UPDATE`                                              | `cosmo_account`, pending offers, open listings (`closeOpenOffers()`)                              |
| Deletion-link request          | `createDeletionToken()`, same file                              | `FOR UPDATE`                                              | its `verification` rows                                                                           |
| COSMO link                     | `linkVerifiedAccount()`, `server/cosmo-accounts.server.ts`      | `FOR SHARE`, the caller                                   | `cosmo_account` upsert                                                                            |
| Ban                            | `banAndSweep()`, `server/staff-users.server.ts`                 | `FOR NO KEY UPDATE`, two batches                          | accepted trades, pending offers, open listings                                                    |
| Set role                       | `$setRole`, `functions/staff-users.ts`                          | `FOR NO KEY UPDATE`                                       | nothing                                                                                           |
| Post a listing                 | `$postListing`, `functions/trade-listings.ts`                   | `FOR SHARE` (`lockLinkedPoster()`)                        | nothing                                                                                           |
| Edit a listing                 | `$editListing`, same file                                       | `FOR SHARE`, poster and claimers                          | pending offers, then the listing `FOR UPDATE`                                                     |
| Withdraw a listing             | `$withdrawListing`, same file                                   | `FOR SHARE`, poster and claimers                          | pending offers, then the listing                                                                  |
| Claim, or offer on a listing   | `lockAndRecheck()`, `server/trades/claim.server.ts`             | `FOR NO KEY UPDATE`, both                                 | links, then the listing `FOR NO KEY UPDATE`                                                       |
| Direct offer                   | `$sendOffer`, `functions/trade-offers.ts`                       | `FOR NO KEY UPDATE`, both                                 | links                                                                                             |
| Counter                        | `$counterOffer`, same file                                      | `FOR NO KEY UPDATE`, both                                 | the offer, then links                                                                             |
| Accept                         | `$acceptOffer`, same file                                       | `FOR NO KEY UPDATE`, both                                 | the offer; for an offer on a listing, the listing (`recheckListingOffer()`), then links           |
| Decline, withdraw, cancel      | `$endOffer`, same file; `$cancelTrade`, `functions/trades.ts`   | `FOR SHARE`, both (`lockPartyTrade()`)                    | the trade, then its listings (`endTrade()`)                                                       |
| Dispute                        | `$openDispute`, `functions/trades.ts`                           | `FOR SHARE`, both (`lockPartyTrade()`)                    | the trade                                                                                         |
| Leave feedback                 | `$leaveFeedback`, `functions/feedback.ts`                       | `FOR SHARE`, both                                         | the trade, `trade_feedback`, stats                                                                |
| Remove feedback (staff)        | `$removeFeedback`, same file                                    | none                                                      | the trade, `trade_feedback`, stats                                                                |
| Staff complete, cancel, extend | `actOnTrade()`, `server/staff-trades.server.ts`                 | `FOR SHARE`, both                                         | the trade, then its listings                                                                      |
| drain-outbox                   | `applyTrades()`, `apps/schedules/src/functions/drain-outbox.ts` | `FOR KEY SHARE`, everyone it may notify, after the cursor | live trades, pending offers, their listings (`breakOffers`), then each completed trade's listings |
| trade-timers, offer passes     | `apps/schedules/src/functions/trade-timers.ts`                  | `FOR KEY SHARE`, both                                     | the offers, never a listing                                                                       |
| trade-timers, deadline pass    | same file                                                       | `FOR KEY SHARE`, both, after the cursor                   | live trades, then their listings                                                                  |
| chat Send                      | `insertMessage`, `apps/chat/src/store.ts`                       | `FOR KEY SHARE`, sender and recipients                    | the trade                                                                                         |
| chat Remove                    | `removeMessage`, same file                                      | none                                                      | the trade                                                                                         |

A new writer that locks more than one kind of row picks its user strength from the table above, follows the rules, and gets a row here.
