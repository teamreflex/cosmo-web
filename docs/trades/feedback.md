# Caps, feedback and the market gate

Windows and caps are constants in `packages/trades/src/timers.ts` and `caps.ts`; read them from there, since the market notice and the composer do.

## Claim cap

- A user may hold `claimCap()` claims at once: `CLAIM_CAP_BASE` (3), plus one per tier in `CLAIM_CAP_TIERS` their score reaches, up to `CLAIM_CAP_CEILING`.
- The score is the feedback score of their linked COSMO address, so a negative score never lowers the cap below the base.
- `claimStanding()` counts the user's live trades claimed from a listing: `accepted` or `disputed`, the user is `to`, and an item carries a `listing_id`. An offer on a listing counts once it is accepted, which is when its cap is checked; a refusal for the cap reads to the poster as the generic `offer_unavailable`, since only the claimer may learn their cap.
- Direct offers, pending offers and open listings are uncapped.

## Listing limits

| Limit                           | Constant             | Value           |
| ------------------------------- | -------------------- | --------------- |
| tokens one listing offers       | `MAX_OFFERED`        | 20              |
| want rows                       | `MAX_WANT_ROWS`      | 10              |
| objekts one row asks for        | `MAX_PER_ROW`        | 20              |
| objekts per unit, and per claim | `MAX_TOTAL_WANTED`   | 30              |
| collections in a choice row     | `MAX_CHOICE_OPTIONS` | 10 (at least 2) |
| values in one range column      | `MAX_RANGE_VALUES`   | 64              |
| note length                     | `MAX_NOTE_LENGTH`    | 500             |

## Rate limits

The limits on posting, editing, claiming, cancelling, disputing and rating are in the table in [docs/tooling.md](../tooling.md#rate-limits). Direct offers, counters and offer answers have none ([offers.md](offers.md)).

## Feedback

- The parties of a completed or timed-out trade, or of one staff cancelled, can rate each other for `FEEDBACK_WINDOW_DAYS` (14) after it ends (`feedbackOpening()`). The window equals `CHAT_RETENTION_DAYS`, so it closes as the chat is blanked.
- A party-cancelled trade can't be rated, because a party can only cancel before anything is sent. A disputed trade waits for staff to end it.
- Each party rates once per trade (`trade_feedback_trade_side_idx`). A rating shows at once, can't be edited, and notifies the rated party.
- A rating counts toward the score only when the trade completed or a token arrived (`feedbackScored()`), so a timed-out trade with nothing sent stays on record without farming score.
- `user_feedback_stats` is keyed by COSMO address, so ratings follow the address across account deletion and relinking ([docs/accounts.md](../accounts.md)).
- The stats are updated by one atomic upsert in the rating's transaction (`addFeedbackStats()`), so concurrent ratings of one address queue on its row. The score is positives minus negatives.
- Staff with `feedback: ["remove-any"]` remove a rating by stamping `removed_at`, which takes a scored rating back out of the stats.
- Ratings show on `/@{username}/feedback`, with badges on listings and trades.

## Market gate

- The trade system is gated by `market: ["access"]` (`marketAccess` in `@apollo/auth`), held by testers, moderators and admins. Signed-out visitors count as `user`, which holds nothing.
- A tester holds market access and nothing else, so people trying the market before launch see it as a plain user will.
- The gate covers pages and entry points only. `/market/*` (through `routes/market/route.tsx`), `/trade/$id` and `/@{$username}/feedback` call `requireMarketAccess()` in `beforeLoad` and 404 without it.
- Links into the market (the navbar, the user menu, the notification bell, the profile report button, offer picking in Trade Matches) check `useHasPermission()(marketAccess)`.
- The server functions aren't gated, with one exception: a direct offer or counter only goes to someone with market access, since they couldn't open it to answer. Trade Matches still lists them, marked not `offerable`, and `preflightOffer()` refuses them `offer_unavailable`.

## Launch and kill switch

1. Add `market: statement.market` to the `user` role in `packages/auth/src/index.ts`.
2. Set `user: true` on the `market` row of `packages/auth/tests/roles.test.ts`.

- There is no database step.
- Removing it again is a safe kill switch only while no one outside staff has a live trade. After that, plain users can't open their trades or chat while the deadlines keep running, so their trades time out or are disputed; staff cancel the live trades from their trade pages instead.

## Notices

The market has two dismissable notices, each remembered per browser in an httpOnly cookie of its name (`lib/functions/market-notice.ts`).

| Notice                | Shown                                                                                                                                                         | Dismissed by                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `market-notice`       | an alert dialog on `/market`, `/market/collections` and listing pages until the visitor accepts it, signed out or not (`components/market/market-notice.tsx`) | Accept                          |
| `range-offers-notice` | the composer's dialog before a listing starts taking offers ([listings.md](listings.md#the-composer))                                                         | its "Don't show this again" box |

- `$dismissNotice` sets the notice's cookie to its version in `NOTICE_VERSIONS` for a year (`useDismissNotice()` in `hooks/use-dismiss-notice.ts`).
- The `/market` route reads every notice cookie on the server in one call (`$fetchDismissedNotices`, `dismissedNoticesQuery`), so SSR renders the dialog open or closed without a flash.
- Bumping a notice's version in `NOTICE_VERSIONS` shows it to everyone again.
- The market notice's claim-cap copy reads `CLAIM_CAP_BASE`, `CLAIM_CAP_TIERS` and `CLAIM_CAP_CEILING`, so it can't drift from `claimCap()`.
