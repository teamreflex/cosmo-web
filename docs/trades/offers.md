# Offers and counters

An offer is a trade that starts `pending` and reserves nothing until it is accepted; it is either a direct offer or counter from Trade Matches, or an offer on a range listing ([listings.md](listings.md#offers-on-range-listings)).

## Offer states

```
                       +--------------+
  $sendOffer --------->|              |-- accept    answerer ---------------> accepted
  $counterOffer ------>|   pending    |-- decline   answerer; or a ban, a
  $claimListing ------>|              |             deletion, a closed
  (any range row)      |  expires_at  |             listing ----------------> declined
                       |  now()+72h   |-- withdraw  proposer; or a ban, a
                       | nothing live |             deletion ---------------> withdrawn
                       +--------------+-- counter   answerer, direct offers
                              |                     only: a new pending offer
                              |                     with parent_id -> this --> countered
                              |-- expire    trade-timers,
                              |             expires_at <= now() ------------> expired
                              +-- go_stale  drain: a token moved or turned
                                            untransferable; or the listing
                                            was edited ---------------------> stale

  proposer = the proposed_by side: from (direct offer, counter) or to (offer on a listing)
  answerer = the other side.  Every answer is refused once expires_at <= now().
```

- The parties' answers go through `transition()`, which checks who acts. The timers, the drain, bans, deletions and listing edits or withdrawals end offers in guarded SQL updates with the statuses from `offerTransition()`.
- Who ends an offer by a ban or deletion depends on the user's role in it: offers they proposed are withdrawn, offers proposed to them are declined ([lifecycle.md](lifecycle.md#bans-and-account-deletion)).

## Direct offers and counters

- `$sendOffer` (`lib/functions/trade-offers.ts`, `lib/server/trades/offer.server.ts`) takes picked tokens on both sides from Trade Matches and creates a `pending` trade with `proposed_by = from`, nothing live, and `offer_received` to the recipient.
- A send is refused `offer_own` to yourself, and `offer_unavailable` when the recipient has no COSMO link, no market access, or no discoverable have list paired with a want list (the people Trade Matches shows).
- Under the lock, both users are locked `FOR NO KEY UPDATE`. The sender's link must still match their session (`cosmo_not_linked`), and the recipient must be unbanned and still linked to the address the preflight judged (`offer_unavailable`).
- `$counterOffer` is open only to the answerer of a direct offer. It creates a new pending offer from the counterer, its own `from` side, with `parent_id` pointing at the original and a fresh 72 hours.
- The original ends `countered` with a `countered { counterId }` event, and its proposer hears `offer_countered`.
- A counter to an offer on a listing is refused `offer_unavailable` before any indexer work, and `transition()` refuses it too (`listing_offer`).
- Accepting a direct offer (`$acceptOffer`) re-checks that both parties are still linked to the pinned addresses and both sides' tokens, then moves it to `accepted` with the claim window (`CLAIM_WINDOW`, 48 h) and makes every item live.
- `$endOffer` declines (the answerer) or withdraws (the proposer). The timeline's `declined` and `withdrawn` events name the side that acted.
- Offers have no cap and no rate limit. An offer on a listing counts toward the claimer's claim cap once it is accepted ([feedback.md](feedback.md)).

## Windows

- A pending offer expires `OFFER_WINDOW` (72 h) after it was sent, judged by the database's `now()`, because nothing on chain decides when an offer ends.
- Every answer is refused `offer_expired` once `expires_at <= now()`, even before `trade-timers` has expired it (`answerOffer()` in `lib/server/trades/trade.server.ts`).
- A token that goes live in another trade leaves the offer pending; accepting it is then refused.
- Chat opens only once an offer is accepted.

## Who hears about an offer

| Event                                               | Notified                                    |
| --------------------------------------------------- | ------------------------------------------- |
| sent, or an offer on a listing created              | the answerer (`offer_received`)             |
| accepted                                            | the proposer (`offer_accepted`)             |
| declined by the answerer, a closed listing or a ban | the proposer (`offer_declined`)             |
| countered                                           | the original's proposer (`offer_countered`) |
| expired                                             | the proposer (`offer_expired`)              |
| stale (drain or listing edit)                       | the proposer (`offer_stale`)                |
| withdrawn, or closed by an account deletion         | nobody                                      |

## What a refusal may reveal

- A refusal about the other party never says why. A token on their side is named as `offer_unavailable { tokenId }` and nothing more, which keeps their locks, live trades and ban status private.
- The caller's own token is named with its reason (`claim_token_unavailable { tokenId, reason }`), so the page can say which serial to swap.
- Ownership is checked first (`tokenRefusal()` in `packages/trades/src/holdings.ts`), so a refusal never reveals anything about a token the caller doesn't hold.
- A ban's declines tell the proposer that the offer was declined, never who was banned.
