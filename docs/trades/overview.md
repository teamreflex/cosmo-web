# Trades

Apollo matches people who want to swap objekts and records each swap, but never moves an objekt: each side sends in the COSMO app, and the schedules app's outbox drain sees the transfers on chain and settles the trade.

## A trade from listing to completion

```
  poster
    | $postListing: a pool of tokens, unit_size, want rows
    v
  listing: open   reserves nothing; a token may sit in many open listings
    |
    |<-- claimer $claimListing: N units, the picked pool tokens, one token
    |    list per want row, and the listing's updated_at they saw
    |
    +-- does any want row have kind "range"? (takesOffers)
    |                                         |
    | no                                      | yes
    | listing_claimed -> poster               v
    |                          trade: pending   proposed_by = to
    |                          expires_at = now() + 72h, nothing live
    |                          offer_received -> poster
    |                                         |
    |     poster $acceptOffer, re-judged  ----+--> declined | withdrawn |
    |     as a claim against the listing      |    expired | stale
    |     as it is now                        |
    v                                         v
  trade: accepted   deadline_at = now() + 48h, items live (a token is live in one trade)
    |
    |  each side sends its tokens in the COSMO app to the other's pinned address
    v
  chain -> indexer -> list_event_outbox -> schedules drain-outbox
    |     a token at its pinned receiver: item sent (chain time, tx hash)
    |
    +-- every item sent -----------------------------------------> completed
    |                                                       picks leave the pool
    +-- a party cancels, nothing sent or arrived yet ------------> cancelled
    +-- a party opens a dispute, or a party is banned -----------> disputed
    +-- trade-timers: deadline_at <= the drain's watermark
    |     nothing owed ------------------------------------------> completed
    |     nothing sent ------------------------------------------> timed_out
    |     something sent and something owed ---------------------> disputed
    |
  disputed   the clock stops; transfers are still recorded; only staff end it
       staff complete ----> completed
       staff cancel ------> cancelled   (staff may also cancel an accepted trade)
       staff extend ------> accepted with a new deadline, or completed if all arrived
```

- A direct offer or counter from Trade Matches enters the same `trade: pending` box with `proposed_by = from`, and is accepted the same way ([offers.md](offers.md)).
- A timed-out or cancelled trade changes nothing on the listing's pool: its picks never left it.
- A deadline that passes with something sent and something owed files a `deadline_passed` report for staff ([lifecycle.md](lifecycle.md)).

## Components

| Piece         | Where                                                                                                            | Role                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Pure rules    | `packages/trades` ([README](../../packages/trades/README.md))                                                    | Transitions, allocation, refusal reasons, the drain's per-row decisions, windows, caps, feedback rules |
| Tables        | `packages/database/src/web/schema.ts` (`#region Trades`), `types.ts`, `sql.ts`                                   | Listings and trades in `trade_offers`, see [data-model.md](data-model.md)                              |
| Web writes    | `apps/web/src/lib/functions/trade-listings.ts`, `trade-offers.ts`, `trades.ts`, `staff-trades.ts`, `feedback.ts` | Server functions; their transaction helpers are in `lib/server/trades/`                                |
| Chain watcher | `drain-outbox` in `apps/schedules` (`applyTrades`, `breakOffers`)                                                | Applies transfers to trades and listing pools, see [drain.md](drain.md)                                |
| Clock         | `trade-timers` in `apps/schedules`                                                                               | Expires offers, declines offers on closed listings, ends trades past their deadline                    |
| Live updates  | `publishTradeUpdates()` in `lib/server/trade-events.server.ts` and `apps/schedules/src/trades.ts`                | Publishes a changed trade's id on Redis `trade-events` after commit                                    |
| Chat          | `apps/chat`, `packages/chat`                                                                                     | One chat per trade, open from `accepted` onward, see [apps/chat/README.md](../../apps/chat/README.md)  |

- The schedules mechanics (batching, cursor, simulation) are in [apps/schedules/CLAUDE.md](../../apps/schedules/CLAUDE.md).
- Every multi-row trade write follows the lock order in [docs/locking.md](../locking.md).
- Two types are called `TradeEvent`: the stored timeline union in `@apollo/database/web/types` and the input `transition()` takes in `@apollo/trades/lifecycle`.

## Files in this folder

| File                           | Read it when you change                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| [data-model.md](data-model.md) | the trade tables, sides, items, wants, units, `updated_at`                                                                     |
| [listings.md](listings.md)     | posting, editing, withdrawing or closing a listing, the composer, the feed, the listing page, claims, offers on range listings |
| [offers.md](offers.md)         | direct offers, counters, offer windows, what a refusal may reveal                                                              |
| [lifecycle.md](lifecycle.md)   | trade statuses, party actions, ending a trade, timers' decisions, disputes, bans                                               |
| [drain.md](drain.md)           | what an on-chain transfer means for a trade, listing or offer                                                                  |
| [feedback.md](feedback.md)     | claim caps, listing limits, rate limits, ratings, the market gate and notices                                                  |

## Where to start

- **A transition rule**: `transition()` in `packages/trades/src/lifecycle.ts` and `tests/lifecycle.test.ts`. Guarded SQL updates take their statuses from `offerTransition()` and `listingTransition()`, so add to those maps instead of hard-coding statuses.
- **What a transfer means**: `decideTransfer()` and `foldTransfers()` in `transfers.ts`, applied by `applyTrades` and `breakOffers` in `apps/schedules/src/functions/drain-outbox.ts`.
- **Windows or caps**: `timers.ts` and `caps.ts`. `CLAIM_WINDOW` applies to claims and accepted offers alike.
- **A listing's terms**: the schemas in `listing.ts`, shared by post and edit, and `checkTerms()` and `insertTerms()` in `lib/server/trades/listings.server.ts`.
- **The listing page or feed**: `lib/server/trades/detail.server.ts` and `feed.server.ts` read, and the verdicts they share with the page are pure in `lib/universal/trade-listings.ts` (`apps/web/tests/listing-viewer.test.ts`). The composer's form rules are in `lib/universal/trade-listing-form.ts` (`tests/trade-listing-form.test.ts`).
- **A timeline event**: the `TradeEvent` union in `packages/database/src/web/types.ts`, its schema in `packages/chat/src/items.ts`, its renderer in `components/trades/trade-events.tsx`, and its strings in all six locales.
- **A notification type**: `tradeNotificationTypes` in `types.ts`, which is a pg enum, so it needs a migration (see [docs/migrations.md](../migrations.md)).
- **A refusal code**: `tradeErrorCodes` in `lib/universal/errors/trades.ts` and its message in `lib/client/errors/trades.ts`.

## Testing locally

- `turbo test --filter @apollo/trades` runs the pure rules. Property tests draw from the seeded PRNG in `tests/generate.ts`, so a failing seed reproduces.
- `bun run simulate` in `apps/schedules` fakes transfers and transferability changes against the local indexer DB, and `bun run task drain-outbox` or `bun run task trade-timers` applies them once (see [apps/schedules/CLAUDE.md](../../apps/schedules/CLAUDE.md)).
