# Trade lifecycle

`transition()` in `packages/trades/src/lifecycle.ts` is the state machine for every trade; writers that end trades or offers in guarded SQL take their statuses from `offerTransition()` and `listingTransition()`.

## Statuses

| Status                                                   | Reached by                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pending`                                                | a direct offer, a counter, an offer on a range listing ([offers.md](offers.md))                                    |
| `accepted`                                               | a claim, an accepted offer, a staff extend                                                                         |
| `completed`                                              | every item sent (drain), a deadline with nothing owed, a staff complete, a staff extend with everything sent       |
| `cancelled`                                              | a party while nothing is sent (`cancelled_by` names them), or staff                                                |
| `timed_out`                                              | the deadline passed the watermark with nothing sent                                                                |
| `disputed`                                               | a party's dispute, a ban (`party_banned`), the deadline with something sent and something owed (`deadline_passed`) |
| `declined`, `withdrawn`, `countered`, `expired`, `stale` | the ways a pending offer ends                                                                                      |

- Live means `accepted` or `disputed` (`liveTradeStatuses`). Open means pending or live (`openTradeStatuses`).
- A disputed trade's deadline stops. Transfers are still recorded, but nothing completes it on its own.

## Ways out of a live trade

| From                     | Event                                           | Who                                     | To                                                 |
| ------------------------ | ----------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| `accepted`               | every item sent                                 | drain                                   | `completed`                                        |
| `accepted`               | `cancel`, nothing sent or arrived               | a party                                 | `cancelled`                                        |
| `accepted`               | `dispute`, before the deadline                  | a party, or a ban                       | `disputed`                                         |
| `accepted`               | `time_out`, deadline at or before the watermark | `trade-timers`                          | `completed`, `timed_out` or `disputed`             |
| `accepted` or `disputed` | `staff_cancel`                                  | staff with `trade: ["cancel-any"]`      | `cancelled`                                        |
| `disputed`               | `staff_complete`                                | staff with `trade: ["resolve-dispute"]` | `completed`                                        |
| `disputed`               | `staff_extend`                                  | staff with `trade: ["resolve-dispute"]` | `accepted`, or `completed` when everything arrived |

## Party actions

`$cancelTrade` and `$openDispute` (`lib/functions/trades.ts`) go through `partyAction()`, which refuses in this order:

1. `trade_status_changed` when the trade is no longer accepted.
2. `trade_deadline_passed` once `deadline_at <= watermark`, since `trade-timers` owns the trade from then.
3. A cancel: `trade_cancel_started` once anything is sent, including a token the indexer shows at its receiver before the drain recorded it (`itemStatus() === "arrived"`).

- A dispute files a `trade` report, sets `dispute_report_id`, freezes the trade and notifies the other party.
- A cancel notifies the other party and changes nothing on the listing's pool, since the picks never left it.

## Ending a trade

`endTrade()` exists in both apps (`lib/server/trades/trade.server.ts` and `apps/schedules/src/trades.ts`) and does the same steps:

1. Sets the status, `cancelled_by` and `ended_at`, guarded on the status it locked.
2. Clears `live` on its items.
3. Locks its listings in id order.
4. If it completed, marks its picks `left_at` in each listing's pool.
5. Closes each listing that can no longer make a unit with `closeSpentListings` ([listings.md](listings.md#listing-lifecycle)). The web app's `endTrade()` runs it itself; the schedules one returns the listings, and the drain or `trade-timers` closes them once every trade in the batch has ended, since one live trade keeps a listing open.

## Events, notifications and live updates

- Every change writes its `trade_messages` event and its notifications in the same transaction as the status change, so neither can disagree with the trade.
- Notifications skip recipients with an active ban, and every recipient's user row is locked in that transaction, because the notification's foreign key takes `FOR KEY SHARE` on it ([docs/locking.md](../locking.md)).
- After the commit, the writer publishes the trade's id on Redis `trade-events` (`publishTradeUpdates()`), and apps/chat re-reads the trade for open trade pages. Publishing before the commit would show stale state.
- In apps/schedules, notifications go in through `insertTradeNotifications` inside the transaction, because the web client there has one connection ([apps/schedules/CLAUDE.md](../../apps/schedules/CLAUDE.md)).

## Timers' decisions

`trade-timers` runs every minute; its locking and batching are in [apps/schedules/CLAUDE.md](../../apps/schedules/CLAUDE.md).

- A deadline is judged against the drain's watermark, `list_drain_cursor.chain_time`, never `now()` (`isTimedOut()`). A transfer stamped before the deadline but drained late still counts, because the watermark only reaches the deadline once that transfer is drained.
- With no watermark yet, nothing times out.
- `transition(time_out)` completes a trade nobody owes anything on.
- It times out a trade where nothing was sent. The picks stay in the listing's pool.
- It disputes a trade where something was sent and something is still owed, since a side may be out of pocket (`disputeAtDeadline`). The `deadline_passed` report names as reporter the side that sent everything it owed (`waitingSide()`), or nobody when both sent part.
- Once the due trades have ended, each listing they came from closes by `listingClosing()`. One that breaks, because the drain dropped pool tokens while its trade was live, sends `listing_closed` to its poster naming no token.
- A pending offer expires on `now()` instead ([offers.md](offers.md#windows)).
- Pending offers on a listing that is no longer open are declined `by: "listing"`. A fill or break closes a listing without locking its offers, so this pass cleans up after it, and `$acceptOffer` refuses such an offer `listing_closed` until then.

## Disputes and staff actions

Staff act through `lib/functions/staff-trades.ts` and `actOnTrade()` in `lib/server/staff-trades.server.ts`.

- Staff can't act on their own trades (`trade_own`).
- Each action names the dispute report it was taken from (none for an undisputed trade), and is refused `trade_status_changed` if `dispute_report_id` has changed since.
- Each action resolves the trade's open reports and writes a staff audit row in the same transaction. How trade reports relate to other reports is in [docs/moderation.md](../moderation.md).
- `$staffCancelTrade` cancels any accepted or disputed trade. The trade page's dialog requires a note, while the server accepts none.
- `$staffCompleteTrade` completes a disputed trade whatever its items have done.
- `$staffExtendTradeDeadline` gives a disputed trade a new deadline from `extendedDeadline()`: the time it had left when it was last frozen, plus 24, 48 or 72 hours. It returns to `accepted` with `dispute_report_id` cleared.
- An extend completes the trade instead when everything has arrived. Otherwise it is refused `trade_party_banned` while a party is banned, because they couldn't sign in to finish it.
- `/admin/reports` offers complete and extend to `resolve-dispute` holders, and cancel to `cancel-any` holders.
- `listing: ["remove-any"]` is in the permission statement, but no server function checks it; banning the poster is the only way staff remove a listing.

## Bans and account deletion

|                                 | Ban (`banAndSweep()` in `lib/server/staff-users.server.ts`)                      | Account deletion                           |
| ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| accepted trades                 | disputed under a `party_banned` report, both parties but the banned one notified | block the deletion (`liveTradesBlocker()`) |
| disputed trades                 | left as they are                                                                 | block the deletion                         |
| open listings                   | `removed`                                                                        | `withdrawn`                                |
| pending offers they proposed    | `withdrawn` by staff                                                             | `withdrawn` by deletion                    |
| pending offers proposed to them | `declined` by staff, the proposer told without saying why                        | `declined` by deletion, nobody told        |

- Both run `closeOpenOffers()` in their own transaction.
- A ban is refused `ban_trade_party` while the acting admin has a live trade with the user.
- The ban's own mechanics are in [docs/auth.md](../auth.md), and deletion's in [docs/accounts.md](../accounts.md).

## Item status and "needs you"

- `itemStatus()` in `transfers.ts` is what the trade page shows per item: `sent` (the drain recorded it), `arrived` (at its receiver before the drain saw it), `waiting`, `not_started` (pending offer), `moved`, `untransferable`, or `not_sent` on an ended trade.
- `needsYou()` decides what My trades marks as waiting on you: answering a pending offer you didn't propose, or sending what you still owe on an accepted trade before its deadline passes the watermark.
