# @apollo/trades

The trade system's pure rules, shared by `apps/web` and `apps/schedules`: no database, Redis or network access, so every rule is unit-tested here. How the system fits together is in [docs/trades/overview.md](../../docs/trades/overview.md).

## Modules

| Export         | Holds                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./lifecycle`  | `transition()`, `partyAction()`, the offer and listing transition maps, `listingClosing()`, `takesOffers()`, `tradeState()`, `tradeListingId()`, `needsYou()` |
| `./transfers`  | the drain's per-row decisions (`decideTransfer()`, `foldTransfers()`) and `itemStatus()`                                                                      |
| `./allocate`   | fitting tokens to want rows (`allocate()`, `allocateUnits()`, `fillsExactly()`, `listingOfferRefusal()`)                                                      |
| `./assignment` | `validateAssignment()`, which checks a claimer's per-row token lists                                                                                          |
| `./holdings`   | why a token can't be offered (`tokenRefusal()`, `tokenRefusals()`, `firstRefusal()`) and `pickSerials()`                                                      |
| `./listing`    | the Zod input schemas for listings, claims, offers and counters                                                                                               |
| `./range`      | the range filter schema, `matchesRange()` and `collapseWholeGroup()`                                                                                          |
| `./composer`   | the listing composer's row helpers                                                                                                                            |
| `./timers`     | windows, `isTimedOut()`, `extendedDeadline()`, `DRAIN_CURSOR_NAME`                                                                                            |
| `./caps`       | the claim cap and listing limits                                                                                                                              |
| `./feedback`   | who may rate a trade, whether a rating is scored, star averages                                                                                               |
| `./events`     | the Redis `trade-events` channel and its message                                                                                                              |

## Contracts between apps

- The web app and the schedules app both end trades and offers in guarded SQL updates. They take statuses from `offerTransition()` and `listingTransition()` and decide outcomes with `transition()` and `listingClosing()`, so both apps move a trade the same way.
- Both apps publish `tradeUpdateMessage()` on `TRADE_EVENTS_CHANNEL` after their transaction commits, and apps/chat subscribes to it.
- `DRAIN_CURSOR_NAME` names the `list_drain_cursor` row whose `chain_time` both apps judge deadlines against.

## Tests

- `turbo test --filter @apollo/trades` runs `tests/`.
- Property tests draw inputs from `seeded()` in `tests/generate.ts`, a seeded PRNG, so a failing run reproduces from its seed.
- What earns a test is in [docs/testing.md](../../docs/testing.md).
