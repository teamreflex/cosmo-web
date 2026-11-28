# Listing limits, feedback and notices

Windows are constants in `packages/trades/src/timers.ts`, listing limits in `caps.ts`, and range limits in `range.ts`; read them from there, since the market notice and the composer do.

## Listing limits

| Limit                                    | Constant              | Value           |
| ---------------------------------------- | --------------------- | --------------- |
| tokens one listing offers                | `MAX_OFFERED`         | 20              |
| options the claimer picks from           | `MAX_LISTING_OPTIONS` | 3               |
| want rows per option                     | `MAX_WANT_ROWS`       | 10              |
| objekts one row asks for                 | `MAX_PER_ROW`         | 20              |
| objekts per option's unit, and per claim | `MAX_TOTAL_WANTED`    | 30              |
| collections in a choice row              | `MAX_CHOICE_OPTIONS`  | 10 (at least 2) |
| values in one range column               | `MAX_RANGE_VALUES`    | 64              |
| ranges in one range row                  | `MAX_RANGE_CLAUSES`   | 4 (at least 1)  |
| note length                              | `MAX_NOTE_LENGTH`     | 500             |

## Rate limits

The limits on posting, editing, claiming, cancelling, disputing and rating are in the table in [docs/tooling.md](../tooling.md#rate-limits). Direct offers, counters and offer answers have none ([offers.md](offers.md)).

## Feedback

- The parties of a completed trade, or of one staff cancelled, can rate each other for `FEEDBACK_WINDOW_DAYS` (14) after it ends (`feedbackOpening()`). The window equals `CHAT_RETENTION_DAYS`, so it closes as the chat is blanked.
- A party-cancelled trade can't be rated: a party cancels alone only before anything is sent, and a cancel both parties agreed to (`both`) blames neither.
- A timed-out trade can't be rated, because a trade times out only when neither side sent anything, so neither stands out.
- A disputed trade waits for staff to end it.
- Each party rates once per trade (`trade_feedback_trade_side_idx`). A rating shows at once, can't be edited, and notifies the rated party.
- A rating counts toward the score only when the trade completed, a token arrived or a payment was confirmed (`feedbackScored()`), so a staff-cancelled trade with nothing sent stays on record without farming score.
- `user_feedback_stats` is keyed by COSMO address, so ratings follow the address across account deletion and relinking ([docs/accounts.md](../accounts.md)).
- The stats are updated by one atomic upsert in the rating's transaction (`addFeedbackStats()`), so concurrent ratings of one address queue on its row. The score is positives minus negatives.
- Staff with `feedback: ["remove"]` remove a rating by stamping `removed_at`, which takes a scored rating back out of the stats.
- Ratings show on `/@{username}/feedback`, with badges on listings and trades.
- The profile header links to that page with a chip (`components/feedback/profile-feedback-chip.tsx`) that shows each rating's count until the address has `FEEDBACK_ESTABLISHED` positive and negative ratings, then the share positive, because one negative swings a short history's share too far.
- The chip tags the address "new" while it has fewer than `FEEDBACK_NEW_RATINGS` visible ratings and its first is under `FEEDBACK_NEW_DAYS` old (`feedbackReadsNew()`). `$fetchFeedbackSummary` decides it on the server, because a clock read during render could differ between the server's HTML and hydration.
- The chip's hover card opens only on a pointer that hovers; on a touch screen a tap follows the link.

## Notices

The market has two dismissable notices, each remembered per browser in an httpOnly cookie of its name (`lib/functions/market-notice.ts`).

| Notice                | Shown                                                                                                                                                                                       | Dismissed by                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `market-notice`       | a stepped guide to trading in an alert dialog on `/market`, `/market/collections` and listing pages until the visitor accepts it, signed out or not (`components/market/market-notice.tsx`) | "Start trading" on its last step |
| `range-offers-notice` | the composer's dialog before a listing starts taking offers ([listings.md](listings.md#the-composer))                                                                                       | its "Don't show this again" box  |

- `$dismissNotice` sets the notice's cookie to its version in `NOTICE_VERSIONS` for a year (`useDismissNotice()` in `hooks/use-dismiss-notice.ts`).
- The `/market` route reads every notice cookie on the server in one call (`$fetchDismissedNotices`, `dismissedNoticesQuery`), so SSR renders the dialog open or closed without a flash.
- Bumping a notice's version in `NOTICE_VERSIONS` shows it to everyone again.
- The market notice's numbers come from `CLAIM_WINDOW` and `FEEDBACK_WINDOW_DAYS`, so its copy can't drift from the rules it describes.
