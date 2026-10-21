# Trades

Apollo matches people who want to swap objekts and records each trade. It never moves an objekt: each side sends in the COSMO app, and the outbox drain sees the transfers on chain and settles the trade. This file maps the system; the code holds the detail.

## Where the code lives

- `packages/trades`: pure logic shared by the web and schedules apps. `lifecycle.ts` (every trade, offer and listing transition), `allocate.ts` and `assignment.ts` (fitting a claimer's objekts to a listing's wants), `inventory.ts` (the order allocation spends copies in), `holdings.ts` (why a token can't be offered, and `pickSerials()`), `range.ts` (the range filter schema and `matchesRange()`), `composer.ts` (the listing composer's row helpers), `transfers.ts` (the drain's per-row decisions), `timers.ts` (windows and deadlines), `caps.ts` (claim caps and listing limits), `feedback.ts` (rating eligibility and scoring), `listing.ts` (the input schemas) and `events.ts` (the Redis `trade-events` message).
- `packages/database/src/web/schema.ts` and `types.ts`: `trade_offers` (listings and trades in one table, told apart by `kind`), `trade_offer_items`, `trade_listing_wants`, `trade_messages` (chat and timeline), `trade_feedback` and `user_feedback_stats`. The status lists and the `TradeEvent` timeline union live in `types.ts`; the `TradeEvent` in `@apollo/trades/lifecycle` is a different type, the events `transition()` takes.
- `apps/web/src/lib/functions`: `trade-listings.ts` (post, edit, withdraw, claim, the listing page), `listing-feed.ts`, `trade-offers.ts`, `trades.ts` (the trade page, My trades, cancel, dispute), `feedback.ts`, `reports.ts` and `staff-trades.ts`. Their transaction helpers are in `lib/server/trades/`, plus `lib/server/trades.server.ts` (`liveTradesBlocker()`, `closeOpenOffers()`), `staff-trades.server.ts` (`actOnTrade()`), `feedback.server.ts` (`addFeedbackStats()`) and `trade-events.server.ts` (`publishTradeUpdates()`).
- `apps/schedules`: `drain-outbox` (transfers), `trade-timers` (deadlines and offer expiry) and `chat-retention`. See `apps/schedules/CLAUDE.md`.
- `apps/chat` and `packages/chat`: the trade chat. See `apps/chat/CLAUDE.md`.

Every writer locks users, then trades, then listings; the full order is under Lock order in `docs/auth.md`.

## Listings

A listing offers specific tokens the poster holds and asks for collections: exact rows (one collection, a count) or range rows (an array per column, where an empty array matches any value). Wanting a specific serial is left to the listing's note. The limits are in `caps.ts`. Posting copies each offered objekt's collection values onto its item and unions them into the listing's arrays, so the feed filters without crossing databases (see the comments on `trade_offers_feed_filters_idx`).

| Status      | Reached by                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `open`      | posting, or a claim's trade ending while the poster still holds every token                                   |
| `claimed`   | someone claiming it; it is frozen until its trade ends                                                        |
| `filled`    | its trade completing                                                                                          |
| `withdrawn` | the poster, or the poster's account deletion                                                                  |
| `broken`    | an offered token leaving the poster or turning untransferable, seen by the drain or when a claim's trade ends |
| `removed`   | the poster being banned                                                                                       |
| `abandoned` | the claim timing out with the poster marked abandoned                                                         |

Listings don't expire. The poster can edit an open listing, which replaces its items and wants in one transaction and moves `updated_at`; a claim carries the `updated_at` the claimer saw and is refused with `listing_updated` if it changed. `listingEventAfter()` decides what a claimed listing becomes when its trade ends. A token may sit in several open listings at once; only a live trade reserves it.

Claiming (`$claimListing`, `lib/server/trades/claim.server.ts`) submits one token list per want row as the picker showed them. The server checks each token fits its row, is the claimer's, transferable, unlocked and not live, refuses through `posterRefusal()` when the poster's side can't be delivered, and creates an `accepted` trade with a 48-hour deadline (`CLAIM_WINDOW`) and both sides' tokens copied as live items. `trade_offer_items_live_token_idx` (`UNIQUE (token_id) WHERE live`) backs up the status guard, so a token is in at most one live trade.

## Trades

A trade's `from` side is whoever proposed the terms (the poster, or an offer's sender) and `to` is whoever accepted them. `transition()` in `lifecycle.ts` is the lifecycle:

- `accepted`: a claim or an accepted offer. Each side sends its tokens in COSMO to the other's pinned address before `deadline_at`.
- `completed`: every item arrived, or staff completed it.
- `cancelled`: a party cancelled while nothing had been sent (`cancelled_by` names who), or staff cancelled it. A party can't cancel once the indexer shows any token at its receiver, even before the drain records it; after that a dispute is the only way out.
- `timed_out`: the deadline passed with something still owed, and `abandoned_by` holds every side that still owed.
- `disputed`: a party opened a dispute, or a ban froze the trade. The deadline stops, transfers still record, and only staff end it.

Parties are matched by user id and pinned addresses (`from_address`, `to_address`) are fixed when the claim's trade or the offer is created, so relinking COSMO doesn't redirect a trade. A live trade (`accepted` or `disputed`) blocks either party's account deletion (`liveTradesBlocker()`).

Each change writes a typed event to `trade_messages` and the in-app notifications in the same transaction (`insertTradeEvent()` and `notifyUsers()` in `lib/server/trades/trade.server.ts`), then publishes the trade's id on Redis `trade-events` after commit (`publishTradeUpdates()`), which apps/chat turns into live updates on open trade pages.

## Direct offers and counters

Trade Matches on a have/want list pair lets a user pick tokens on both sides and send an offer (`$sendOffer`). The offer is a `pending` trade that reserves nothing. Its recipient accepts it (it becomes `accepted` with the claim's 48-hour deadline and its tokens go live), declines it, or counters it; its sender can withdraw it. A counter is a new pending offer with `parent_id` pointing at the original, which ends as `countered`, and it starts its own window.

A pending offer expires 72 hours after it was sent (`OFFER_WINDOW`, `expires_at`), judged by the database's `now()` rather than the chain watermark, because nothing on chain decides when an offer ends. When the drain sees one of its tokens leave its holder or turn untransferable, the offer turns `stale` and its sender is told. A token that goes live in another trade leaves the offer pending, and accepting it is then refused. Offers don't count toward the claim cap and have no cap of their own. Chat opens only once an offer is accepted.

## Completion: the outbox drain

The indexer appends a `list_event_outbox` row for every transfer and transferability change, and `drain-outbox` in apps/schedules applies each batch to the web database in one transaction (`applyTrades`). `foldTransfers()` and `decideTransfer()` in `packages/trades/src/transfers.ts` decide each row in order:

- A pinned token reaching its receiver's pinned address marks the item sent, with the chain time and hash. A trade with nothing left owed completes and fills its listing; a disputed trade records the transfer but waits for staff.
- A token leaving elsewhere, or turning untransferable, posts a `token_moved` or `token_untransferable` event on its live trade, breaks the open listings offering it and turns pending offers holding it stale (`breakOffers`).
- A row whose indexer `transfer` row no longer exists (a hot-block rollback) is skipped for trades.

Only the exact token ids pinned on the trade count; a party who sends a different copy sorts it out in chat or through a dispute. Marking an item sent is idempotent, so a replayed row can't advance a trade twice.

## Timers

`trade-timers` runs every minute. It ends accepted trades whose `deadline_at` is at or before the drain's watermark, `list_drain_cursor.chain_time`, never `now()`: a transfer stamped before the deadline but drained late still counts, because the watermark only reaches the deadline once that transfer is drained (`isTimedOut()`). A due trade nobody owes anything on completes; otherwise it times out with every side still owing marked abandoned, and its listing is abandoned, reopened or broken (removed if the poster is banned). It logs an error while there is no watermark or it trails the clock by more than 10 minutes, since timeouts trail the watermark. Pending offers expire in a separate transaction on the clock. Staff extend a disputed trade with `extendedDeadline()`: the time left when it froze plus 24, 48 or 72 hours.

## Claim caps and feedback

A user may hold `claimCap()` claims at once (accepted or disputed trades they claimed from a listing, counted by `claimStanding()`): 3, plus one per score tier reached in `CLAIM_CAP_TIERS`, up to `CLAIM_CAP_CEILING`. Open listings and direct offers aren't capped.

The parties of a completed or timed-out trade, or one staff cancelled, can rate each other for 30 days after it ends (`feedbackOpening()`); a party-cancelled trade can't be rated, and a disputed one waits for staff. A rating shows at once, can't be edited, and notifies the rated party. It counts toward the score only when the trade completed or a token arrived (`feedbackScored()`), so an abandoned trade stays on record without being farmable. `user_feedback_stats` is keyed by COSMO address and updated by one atomic upsert in the rating's transaction (`addFeedbackStats()`); the score is positives minus negatives. Staff remove ratings with `feedback: ["remove-any"]`, which takes a scored rating back out of the stats. Ratings show on `/@{username}/feedback`, with badges on listings and trades.

## Chat

Each trade has a chat in apps/chat, a separate Effect service the browser reaches over a websocket (`VITE_CHAT_URL`), authenticated with short-lived Better Auth JWTs (see Chat tokens in `docs/auth.md`). The web app never reads or writes message text. Bodies are AES-256-GCM ciphertext under `MESSAGE_KEY`, bound to the trade id. Access is decided only in `packages/chat/src/policy.ts`: parties join a trade from `accepted` onward and send only while it is live; staff with `trade: ["read-any"]` join only while the trade or one of its messages has an open report or dispute. Under that report, staff with `trade: ["message"]` also write to both parties, on live and ended trades alike; other staff read only. A staff message is stored with `trade_messages.by_staff`, notifies both parties with `trade_message` naming the staff member, and is audited as `trade:message`. Every viewer, its author included, sees it on the left in an orange bubble under the staff member's COSMO username (else their Apollo username) and a staff label; once their account is deleted it reads as "{appName} staff". Parties can't report a staff message. Removing a message needs `trade: ["remove-message"]` and is audited. `chat-retention` blanks message bodies 14 days after the trade ends (`CHAT_RETENTION_DAYS`); events stay, and a reported message keeps its own encrypted copy in `report_messages`.

## Disputes and staff actions

A party opens a dispute (`$openDispute`) on an accepted trade before its deadline passes the watermark. It files a `trade` report, sets `dispute_report_id` and freezes the trade. Staff act through `lib/functions/staff-trades.ts`: with `trade: ["cancel-any"]` they cancel any accepted or disputed trade from its trade page, with a required note (no abandoned marks; the listing reopens, breaks, or is removed if the poster is banned), and with `trade: ["resolve-dispute"]` they complete or extend a disputed one from `/admin/reports`, which can also cancel it. Each action names the dispute report the trade is under (none for an undisputed trade), is refused if that has changed, and resolves the trade's open reports in the same transaction. Staff can't act on or see reports about trades they are a party to. A ban disputes the user's accepted trades under a `party_banned` report, removes their open listings and closes their pending offers (`banAndSweep()`, see Bans in `docs/auth.md`). Staff read any trade at `/trade/$id` with `trade: ["read-any"]`.

`listing: ["remove-any"]` is in the permission statement, but no server function uses it and `listing` report targets aren't supported, so banning the poster is the only way staff remove a listing.

## Launch gate

The trade system is gated by `market: ["access"]` (`marketAccess` in `@apollo/auth`), held by moderators and admins; signed-out visitors count as `user`. The gate covers pages and entry points only. `/market/*` (through `routes/market/route.tsx`), `/trade/$id` and `/@{$username}/feedback` call `requireMarketAccess()` in `beforeLoad` and 404 without it. The navbar's Market links, the My trades links in the user menu and notification bell, the report button on profiles and the offer picking in Trade Matches check `useHasPermission()(marketAccess)`. The server functions aren't gated.

Launching is adding `market: statement.market` to the `user` role in `packages/auth/src/index.ts` and setting `user: true` on the `market` row of `packages/auth/tests/roles.test.ts`, then deploying; there is no database step. Removing it again works as a kill switch only while no one outside staff has a live trade: after that, plain users can no longer open their trades or their chat while the deadlines keep running, so whoever hasn't sent is marked abandoned. Past that point, staff cancel the live trades from their trade pages instead (`trade: ["cancel-any"]`).

## Market notice

`/market`, `/market/collections` and listing pages show an alert dialog until the visitor accepts it (`components/market/market-notice.tsx`). Accept calls `$acceptMarketNotice`, which sets the httpOnly `market-notice` cookie to `MARKET_NOTICE_VERSION` for a year (`lib/functions/market-notice.ts`). The `/market` route reads the cookie on the server, so SSR renders the dialog open or closed with no flash; signed-out visitors see it too. Bumping `MARKET_NOTICE_VERSION` shows a changed notice to everyone again. Its claim-cap copy reads `CLAIM_CAP_BASE`, `CLAIM_CAP_TIERS` and `CLAIM_CAP_CEILING`, so it can't drift from `claimCap()`.

## Token ids across the databases

The web database stores token ids as `integer` (`trade_offer_items.token_id`, like pins and binder entries), and the schemas cap them at 2^31 − 1 (`tokenIdSchema` in `listing.ts`). The indexer stores them as text: `objekt.id` is `varchar` and `list_event_outbox.token_id` is `text`. Convert at the boundary: `String(tokenId)` into an indexer query, `Number(row.id)` out of one (`readIndexerTokens()` in `lib/server/trades/holdings.server.ts`, and the drain in `apps/schedules`).

## Unused payment schema

The schema carries a payment side that nothing creates or acts on. It is the starting point for sales:

- Enums `payment_method` (`paymentMethods`) and `listing_offer_mode` (`listingOfferModes`) in `packages/database/src/web/types.ts`.
- The `payment` kind on `trade_item_kind` and `trade_want_kind`, with `trade_offer_items.amount`, `currency`, `method`, `marked_paid_at` and `confirmed_at`, `trade_listing_wants.amount` and `currency`, their branches of `trade_offer_items_objekt_chk` and `trade_listing_wants_shape_chk`, and `trade_listing_wants_payment_idx` (one payment row per listing).
- `trade_offers.offers` (the offers mode, listings only; `trade_offers_trade_chk` keeps it null on trades).
- The `marked_paid` and `payment_confirmed` events in `TradeEvent` and `packages/chat/src/items.ts`, which `trade-events.tsx` renders as nothing.
- In `packages/trades`: the payment `TradeItemState`, the `mark_paid` and `confirm_payment` events in `transition()`, and payments in `owingSides()`, `feedbackScored()` and `feedbackRole()`.
- The listing feed's want matching (`lookingForConditions()` in `apps/web/src/lib/server/trades/feed.server.ts`), which never matches the payment row.
- The `payment_not_received` dispute reason, which `open-dispute-dialog.tsx` offers only on a trade with a payment.

What keeps it unreachable: `listingInputSchema` and `editListingInputSchema` take only exact and range wants and token ids in strict objects, the offer schemas take token-id arrays, every insert writes `kind: "objekt"`, `posterRefusal()` refuses a claim on a listing with a payment want, `listingTypes` is `["trade"]`, and no server function runs `mark_paid` or `confirm_payment`. Adding sales means lifting those, plus a new `user.payment_methods` column, a buyer/seller notification or two, an FX snapshot on the trade, and moving market price data from sale lists to sale listings (`sync-market-stats`).
