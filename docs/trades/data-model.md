# Trade data model

The trade tables live in `packages/database/src/web/schema.ts` under `#region Trades`; their CHECK constraints encode most of the rules below, so read a constraint's predicate before relaxing it.

## One table, two kinds

- `trade_offers.kind = 'listing'` is a listing. `kind = 'trade'` is everything else: a claim's trade, a direct offer, a counter or an offer on a listing.
- An offer is a trade that starts `pending`. Accepting it moves the same row to `accepted`.
- Each kind has its own status list (`listingStatuses` and `tradeStatuses` in `types.ts`), enforced by `trade_offers_status_chk`.
- A listing has no `to` side: `trade_offers_listing_chk` keeps `to_user_id`, `to_address`, `parent_id`, `deadline_at`, `accepted_at` and `expires_at` null.

## Sides

| Row                     | `from` | `to`      | `proposed_by`             |
| ----------------------- | ------ | --------- | ------------------------- |
| listing                 | poster | none      | null                      |
| claim's trade           | poster | claimer   | null (it starts accepted) |
| offer on a listing      | poster | claimer   | `to`                      |
| direct offer or counter | sender | recipient | `from`                    |

- `proposed_by` stays set after the offer ends. The proposer may withdraw; only the other side (the answerer) may accept, decline or counter.
- A pending row has one of two legal shapes: `proposed_by = from` with no item carrying a `listing_id`, or `proposed_by = to` with items from a listing. `tradeState()` throws on anything else, so an insert path that mixes them breaks every read of that trade. The pending `TradeState` carries only `proposedBy`; whether it came from a listing is `tradeListingId()`.
- `from_address` and `to_address` are pinned when the row is created. Relinking COSMO never redirects a trade, and the drain compares transfers only against these addresses.
- Parties are matched by user id. `from_user_id` and `to_user_id` go null when an account is deleted, which a live trade blocks (`liveTradesBlocker()` in `lib/server/trades.server.ts`).

## Items (`trade_offer_items`)

| Item                                              | `offer_id`  | `listing_id`             | Can be `live` | Can get `left_at` |
| ------------------------------------------------- | ----------- | ------------------------ | ------------- | ----------------- |
| listing pool row                                  | the listing | null                     | never         | yes               |
| poster's pick on a trade                          | the trade   | the listing it came from | yes           | no                |
| claimer's token, or either side of a direct offer | the trade   | null                     | yes           | no                |

- A trade's items are copies, so editing the listing never changes a trade. `tradeListings()` and `tradeListingId()` find a trade's listing through `listing_id`.
- Every item copies its collection's indexer values (slug, artist, member, season, class, on_offline), so the feed filters without crossing databases.
- `live` is true only on an accepted or disputed trade's items, and is set in the same statement as the status change.
- `trade_offer_items_live_token_idx` (`UNIQUE (token_id) WHERE live`) keeps a token in at most one live trade. It is the last guard for every race on a token. A write that sets `live` goes through `refuseLiveClash()`, which turns the clash into a named refusal instead of a 500.
- A pool row that leaves (given in a completed trade, or gone from the poster) gets `left_at` and stays as the listing's history. Every pool read filters `left_at IS NULL`, and `trade_offer_items_left_chk` lets only pool rows leave.
- A pending offer's items are never live and reserve nothing.
- `trade_offer_items.token_id` is an integer and the indexer's ids are text: convert at the boundary, as [docs/database.md](../database.md) describes.

## Wants (`trade_listing_wants`)

| Kind      | Matches                                                                                 | Stored as                                                                       |
| --------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `exact`   | `count` copies of one collection                                                        | the collection's values on the row                                              |
| `range`   | `count` objekts where every narrowed column holds the objekt's value (`matchesRange()`) | one array per column; an empty array matches anything, at least one is narrowed |
| `choice`  | `count` objekts in any mix of 2 to 10 named collections                                 | the collections in `trade_listing_want_options`                                 |
| `payment` | dormant (see below)                                                                     | `amount` and `currency`                                                         |

- Wants are inserted together and replaced together, so id order is the posted order.
- A range row may narrow `collection_nos`. It is matched against the indexer's current collection number, because staff can edit it, so items never copy it.
- Wanting a specific serial is left to the listing's note.

## Units

- `unit_size` is how many pool tokens one unit takes, and one unit gives the want rows at their counts. `trade_offers_unit_size_chk` requires it on listings and forbids it on trades.
- A claim of N units picks `N * unit_size` pool tokens and gives each row's count times N (`scaleWants()`).
- A listing posted without `unitSize` gets `unit_size` = the number of offered tokens: a bundle, everything for everything (`withListingRules()` in `listing.ts`).
- Several claims on one listing can be live at once, each its own trade, as long as they pick different tokens.
- A listing has a ratio (`hasRatio()`) when its unit is smaller than everything it has ever offered, the pool and the tokens that left it, so one whose pool is down to a unit's worth keeps its ratio and a one-objekt listing never has one. Every other listing reads as a bundle.

## `updated_at` as a concurrency token

- Listing writes set it with `bumpUpdatedAt` (`packages/database/src/web/sql.ts`): the database clock, at least a millisecond past the old value. It strictly increases whatever the app servers' clocks say, and its millisecond precision survives a JS `Date` round trip.
- A claim sends the `updated_at` it saw, and the listing lock's `WHERE` includes it. A claim that waited behind an edit or a pool drop finds no row and is refused `listing_updated`.
- What moves a listing's `updated_at`, and what doesn't, is in [listings.md](listings.md).

## Timeline (`trade_messages`)

- Chat text and typed events share one stream per trade. Text bodies are ciphertext that only apps/chat reads ([apps/chat/README.md](../../apps/chat/README.md)).
- Events and notifications are written in the transaction that changes the trade ([lifecycle.md](lifecycle.md)).

## Dormant payment schema

- The schema carries a payment side that nothing creates: the `payment` item and want kinds, `trade_offers.offers`, the `payment_method` enum, the `marked_paid` and `payment_confirmed` events, and their branches in `transition()`, `owingSides()`, `feedbackScored()` and `feedbackRole()`.
- It is unreachable: the input schemas take only exact, range and choice wants and token ids, every insert writes `kind: "objekt"`, `posterBlocked()` refuses a listing with a payment want, and no server function runs `mark_paid` or `confirm_payment`.
- Opening sales also needs a `user.payment_methods` column, buyer and seller notifications, an FX snapshot on the trade, and market price data on sale listings rather than sale lists (`sync-market-stats`).
