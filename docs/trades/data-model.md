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
| poster's payment on a trade                       | the trade   | the listing it came from | never         | no                |
| claimer's token, or either side of a direct offer | the trade   | null                     | yes           | no                |

- A trade's items are copies, so editing the listing never changes a trade. `tradeListings()` and `tradeListingId()` find a trade's listing through `listing_id` on any of its items; a trade from a buy listing has only the poster's payment to carry it, so `tradeListings()` gives that listing no tokens.
- Every item copies its collection's indexer values (slug, artist, member, season, class, on_offline), so the feed filters without crossing databases.
- `live` is true only on an accepted or disputed trade's items, and is set in the same statement as the status change.
- `trade_offer_items_live_token_idx` (`UNIQUE (token_id) WHERE live`) keeps a token in at most one live trade. It is the last guard for every race on a token. A write that sets `live` goes through `refuseLiveClash()`, which turns the clash into a named refusal instead of a 500.
- A pool row that leaves (given in a completed trade, or gone from the poster) gets `left_at` and stays as the listing's history. Every pool read filters `left_at IS NULL`, and `trade_offer_items_left_chk` lets only pool rows leave.
- A pending offer's items are never live and reserve nothing.
- `trade_offer_items.token_id` is an integer and the indexer's ids are text: convert at the boundary, as [docs/database.md](../database.md) describes.

## Wants (`trade_listing_wants`)

| Kind      | Matches                                                                                                                               | Stored as                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `exact`   | `count` copies of one collection                                                                                                      | the collection's values on the row                                                                                                              |
| `range`   | `count` objekts where some range matches, and a range matches when every narrowed column holds the objekt's value (`matchesRanges()`) | 1 to `MAX_RANGE_CLAUSES` ranges in `trade_listing_want_ranges`, one array per column; an empty array matches anything, at least one is narrowed |
| `choice`  | `count` objekts in any mix of 2 to `MAX_CHOICE_OPTIONS` named collections                                                             | the collections in `trade_listing_want_options`                                                                                                 |
| `payment` | nothing: it prices one unit (see [Payments](#payments))                                                                               | `amount` (null when the listing only takes offers) and `currency`, at most one per option (`trade_listing_wants_payment_idx`)                   |

- Each row has an `option`, 0 to `MAX_LISTING_OPTIONS - 1` with no gaps: the claimer gives one option, every row in it at its count. A listing with one option has every row at 0 and reads as a listing without options.
- `listingOptions()` (`lib/universal/trade-listings.ts`) groups the rows by option once and prices each option's payment; claims, offers and their rechecks take `options[n]` and judge it as they would a listing of that one option.
- A trade from a listing stores the option it gave in `trade_offers.listing_option`; other trades and listings leave it null (`trade_offers_listing_option_chk`). Every write of a trade from a listing sets it, so its readers throw on a null one.
- `listing_option` names an option of the listing's terms when the trade was made, and an edit can reorder or remove options under a live or completed trade, so only a pending offer, which an edit turns stale, is judged against the listing's current options; anything else reads the trade's own items.
- Wants are inserted together and replaced together, so id order is the posted order.
- A range row's ranges are ordered by `position` and may overlap: an objekt fits the row once however many of them match it, so its match count is the union.
- At least one range per row is the input schemas' rule (`rangesSchema`), because a CHECK can't span the two tables.
- A range may narrow `collection_nos` in `trade_listing_want_ranges`. It is matched against the indexer's current collection number, because staff can edit it, so items never copy it.
- Wanting a specific serial is left to the listing's note.

## Units

A listing either offers a pool in units of `unit_size`, or is a buy listing that offers no objekts and pays for up to `max_units` units; `listingUnits()` parses the row into `{ kind: "pool", unitSize } | { kind: "buy", maxUnits }`, and `trade_offers_unit_size_chk` keeps exactly one of the two on a listing and both off a trade.

| Units  | One unit takes                   | A claim of N units                                           | Bounded by                                                              |
| ------ | -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `pool` | `unit_size` pool tokens          | picks `N * unit_size` pool tokens                            | the free pool                                                           |
| `buy`  | nothing: the poster pays instead | picks nothing, records `trade_offers.units = N` on its trade | `max_units` less the `units` of the listing's live and completed trades |

- One unit gives one option's want rows at their counts, so a claim of N units gives each row of its option at its count times N (`scaleWants()`), and its payment item holds the price times N.
- A listing posted without `unitSize` or `maxUnits` gets `unit_size` = the number of offered tokens: a bundle, everything for everything (`withListingRules()` in `listing.ts`).
- `trade_offers.units` is set only on trades from buy listings (`trade_offers_units_chk`); a pool listing's trade counts its units from its picks. `listingTakenUnits()` in `sql.ts` sums it for a buy listing (a pool listing reads 0 without the sum), and a pending offer holds none.
- Several claims on one listing can be live at once, each its own trade, as long as they pick different tokens.
- A listing has a ratio (`hasRatio()`) when its unit is smaller than everything it has ever offered, the pool and the tokens that left it, so one whose pool is down to a unit's worth keeps its ratio and a one-objekt listing never has one. Every other listing reads as a bundle.

## `updated_at` as a concurrency token

- Listing writes set it with `bumpUpdatedAt` (`packages/database/src/web/sql.ts`): the database clock, at least a millisecond past the old value. It strictly increases whatever the app servers' clocks say, and its millisecond precision survives a JS `Date` round trip.
- A claim sends the `updated_at` it saw, and the listing lock's `WHERE` includes it. A claim that waited behind an edit or a pool drop finds no row and is refused `listing_updated`.
- What moves a listing's `updated_at`, and what doesn't, is in [listings.md](listings.md).

## Timeline (`trade_messages`)

- Chat text and typed events share one stream per trade. Text bodies are ciphertext that only apps/chat reads ([apps/chat/README.md](../../apps/chat/README.md)).
- Events and notifications are written in the transaction that changes the trade ([lifecycle.md](lifecycle.md)).

## Payments

A payment is money the two parties move outside Apollo; the trade records what was agreed and whether its recipient says it arrived.

| Where                    | Holds                                                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| listing's payment wants  | the claimer's: one per option that asks for a payment, each its own asking price for one unit, none when the listing only takes offers; the poster's: one in option 0 that prices every option; the currency                 |
| `trade_offers` (listing) | `payment_side` (`to` the claimer pays, `from` the poster pays on top of their objekts or, on a buy listing, alone), `payment_methods`, `offers`                                                                              |
| `trade_offers` (trade)   | `payment_methods`: on a trade with a payment, the listing's methods as the claim read them                                                                                                                                   |
| trade's payment item     | `amount` for every unit the trade took, at the asking price or the offer's amount, `currency`, `sender`; `marked_paid_at` once the sender marks it paid; `confirmed_at` and `method` once the recipient confirms it received |

- A listing's items stay objekts. Its payment is its payment wants, sent by `payment_side`, with one currency, set of methods and offer mode whichever option is given; `trade_offers_payment_chk` keeps a listing's side, offer mode and at least one method together, and a trade has no side or mode (`trade_offers_trade_chk`).
- `offers` is the payment's offer mode: `price_only`, `price_or_offer` or `offer_only` ([listings.md](listings.md#offers-on-listings)). `trade_listing_wants_shape_chk` lets a payment want's `amount` be null, which the app writes only with `offer_only`; `listingPayment()` throws on any other pairing.
- A claim or an offer writes the trade's payment item with `sender = payment_side` (`insertTrade()`). A poster's payment item keeps `listing_id`, so readers that find a trade's listing through its items still find it, a buy listing's trade included; a claimer's has none, like their tokens.
- A payment item is never live, so `goLive` and every other write that sets `live` touch objekt items only.
- Amounts are integer minor units in code, two decimals in every currency, KRW included (`packages/trades/src/payment.ts`). The input caps one unit at `MAX_PAYMENT_AMOUNT`, so the units a claim can take (`MAX_TOTAL_WANTED`) and a buy listing's most units (`MAX_BUY_UNITS`) keep every total inside `numeric(14,2)`.
- A listing's currency must have a rate on the newest `fx_rates` date (`assertSupportedCurrency()`), and every price shows in it, never converted.
- The claim copies the listing's methods onto the trade (`insertTrade()`), under the listing lock's `updated_at` guard, so an edit never changes what a live trade can be confirmed by or shows. `$confirmPayment` and the trade page read the trade's own.
- Only the recipient's Confirm received settles a payment. The payer's Mark paid is their word that they paid, which only the deadline counts ([lifecycle.md](lifecycle.md#payments)).
- When one side sends nothing but the payment (its part is `pay`, `tradeParts()`), its rater is the buyer and the other the seller; a payment beside objekts on both sides (`send_pay`) leaves two traders (`feedbackRole()`).
- A listing is a sale or a buy only when one side is payment-only, judged per option from each side's part (`listingParts()`): an option asking for the claimer's payment and no objekt rows is a sale, a buy listing (`max_units` set, never judged from how many objekts are left in a pool) a buy whichever option is given, anything else a trade. A listing is every type its options make it (`listingTypesOf()`), so "any Special objekt or $3" is both a trade and a sale, mirrored in SQL by the feed's Type filter.
- Direct offers and counters carry no payment.
