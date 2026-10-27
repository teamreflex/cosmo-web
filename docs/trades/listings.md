# Listings and claims

A listing offers a pool of the poster's tokens in units, and stays open while the trades claimed from it run beside it.

## Listing lifecycle

```
  $postListing
       |
       v
  +----------+   claims start trades beside it; the listing row itself doesn't change
  |   open   |   pool = its item rows with left_at null, live trades' tokens included
  +----------+
    |   |   |
    |   |   +-- poster withdraws, or deletes their account -----------> withdrawn
    |   |       (pending offers end; live trades carry on)
    |   +------ poster is banned ------------------------------------> removed
    |           (pending offers end; accepted trades are disputed)
    |
    +-- after any of its trades ends, or the drain drops a pool token:
        listingClosing(pool, unit_size, live, completed)
          pool >= unit_size, or a trade still live --------> stays open
          else one of its trades completed ----------------> filled
          else --------------------------------------------> broken
                                                  listing_closed -> poster
```

| Pool change                                                         | Effect                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| a trade completes                                                   | its picks get `left_at`                                                                         |
| a trade is cancelled or times out                                   | nothing; the picks it hadn't sent never left the pool                                           |
| the drain sees a pool token leave the poster or turn untransferable | `left_at`, `updated_at` bumped                                                                  |
| the poster edits                                                    | rows still in the pool and all wants replaced, `updated_at` bumped, pending offers turn `stale` |

- A listing never reopens and never expires.
- `listingClosing()` waits while a trade is live because a poster sending a pick to its claimer also leaves the poster, so the drain drops that pick from the pool before the trade completes.
- `closeSpentListings` applies the rule after every trade ends and after every drain drop. The web app runs it in `endTrade()`; the drain and `trade-timers` run it once per batch, after every trade the batch ends.
- Every break sends `listing_closed` to the poster in the same transaction unless they are banned. It names the token when the drain dropped one, and none when a cancelled or timed-out trade left the listing broken, since no single token did. A fill notifies nobody.
- `claimed` and `timed_out` are listing statuses nothing writes: no listing holds `claimed`, which stays a `trade_offer_status` value, and `timed_out` marks older listings that closed when their one trade timed out.

## Posting, editing, withdrawing

- **Post** (`$postListing`): `checkTerms()` resolves the wants and checks every offered token against the indexer before the transaction. The transaction locks the poster, re-checks the tokens for locks and live trades (`recheckTokens()`) and inserts the listing, its pool rows and its wants.
- A token the poster can't offer comes back as a `token_unavailable` result naming it, not as a thrown error, so the composer can show the serial.
- A token may sit in several open listings at once. Only a live trade reserves it.
- **Edit** (`$editListing`): replaces the listing arrays, pinned address, unit size, note, the pool rows still in the pool and the wants in one transaction. `created_at` never changes, so the listing keeps its place in the feed.
- An edit leaves its live trades alone, since they hold their own copies. It may keep a token that is live in one of the listing's own trades (`readWebTokenFlags()` with `editedListing`).
- The composer's reads, `$fetchOfferedTokenRefusals` and `$fetchTradeTokenStates`, take the edited listing too once the server confirms it is the caller's, so neither flags nor greys out what Save would keep.
- An edit turns the listing's pending offers `stale` (event `{ type: "stale", reason: "edited" }`, `offer_stale` to each claimer). An offer sent after the edit read them refuses the edit with `listing_updated`.
- **Withdraw** (`$withdrawListing`): `open -> withdrawn`. Its pending offers are declined `by: "listing"` with `offer_declined` to each claimer, and its live trades carry on. An offer sent after the withdrawal read them is left for `trade-timers` to decline.
- A ban or an account deletion closes the poster's listings in the same transaction (see [lifecycle.md](lifecycle.md#bans-and-account-deletion)).
- A listing's `updated_at` moves on an edit, a drain drop and every status change. Claims, offers and completions leave it alone, since the tokens they touch were already out of the free pool.

## The composer

`components/trade-listings/listing-composer.tsx`, with its form helpers in `lib/universal/trade-listing-form.ts`, edits the posting input directly, and its UI speaks in ratios, never units.

- The Ratio control shows once the want rows ask for something and two or more objekts are offered, or when an edit's ratio takes more than the pool holds. The poster steps their side, the unit size, from 1 to the pool's size; the other side is the want rows' total, shown with how many trades the pool makes.
- The form's unit size is none, a bundle that takes the whole pool however the pool changes, or a number, and Post and Save send it. A new listing starts as a bundle, and stepping the ratio up to the pool's size makes it one again (`stepUnitSize()`).
- A number never grows: removing objekts holds it to the smaller pool, but not below 1, and adding them leaves it be (`followUnitSize()`), so a ratio that met the pool stays a ratio when the poster restocks.
- An edit prefills the pool, the listing's own live objekts included and the tokens that left it not, and the unit size only when the listing has a ratio (`hasRatio()`, `listingToFormValues()`).
- An edit's unit size isn't held to the pool, because tokens sent in a live trade leave the pool while that trade keeps the listing open. When the pool holds less than a trade takes, the Ratio control shows and Save waits for the poster to lower the ratio or add objekts.
- An "any of" row is filled through the collection search exact rows use, its collections shown as removable cards, with a count.
- The first range row carries a note that the listing will take offers, so the poster picks the objekts, and points to "any of" for specific collections.
- A Post or Save that makes a listing start taking offers (a new one with a range row, or an edit that adds the first) opens a dialog explaining offers first (`composer-range-confirm.tsx`). Back returns to the form, where the poster can make the row an "any of" instead, and its "Don't show this again" box dismisses the `range-offers-notice` ([feedback.md](feedback.md#notices)).
- The footer holds Post and Save back with a translated reason for what the schema refuses (`composerBlock()`): an "any of" row with fewer than two or more than `MAX_CHOICE_OPTIONS` collections or one collection twice, two rows naming the same set (`choicesDistinct()`), a unit size over the pool. Every row's count goes into the total the steppers keep under `MAX_TOTAL_WANTED`.
- A collection the indexer doesn't know is refused by the server with `listing_want_unknown`.

## The feed

`$fetchListingFeed` (`lib/server/trades/feed.server.ts`) shows every open listing the filters match, however much of its pool live trades hold; a listing leaves it once it closes.

- Each row counts its pool's free objekts: no live copy and no lock by the poster (`freePoolCount()`, at most `MAX_OFFERED` pool rows per listing, each probing `trade_offer_items_live_token_idx` and `address_token_idx`).
- The count is selected for the page's rows only, never filtered on, so neither the page nor its total (`$fetchListingFeedTotal`) runs it for every open listing.
- It reads only the web database, so a free token the poster has since moved still counts until the drain drops it. A lock never reaches the drain, so a locked token stays in the pool, blocked, until the poster unlocks it or edits it out.
- Each row carries its unit size, its free count (which may be 0) and how many objekts the listing has ever offered. A row with a ratio ([data-model.md](data-model.md#units)) shows it, unit size to the want rows' total, in place of the arrow, with how many objekts are free; a bundle keeps the arrow.
- Choice rows show their collections' thumbnails and read "Any of 4 collections".
- The "Looking for" filter matches a want row holding every narrowed value: an exact row's copied values, a range's columns (empty matches any value), or one of a choice row's collections in `trade_listing_want_options`, so a member of one collection and the season of another don't add up.

## The listing page

`$fetchTradeListing` answers the page from one read of the listing row: the public `listing` and the session's `viewer`, whose candidate takes its free count from the public pool. If any part fails, the page shows its error.

- Every listing-page query sits under `tradeListingKey`, which `removeViewerQueries()` removes on an account change. The route sets `preload: false`, since a candidate's answer reads their holdings.
- `listing` is public and never names a claimer. It carries the unit size and every objekt the listing has offered, the ones that left the pool included, each once (one offered again after it left shows as its latest row).
- Each objekt says where it stands (`poolAvailability()`): `free`, `in_trade` (a live copy, whoever holds it now), `traded` (`left_at` set, with when, shown dimmed) or `blocked` (moved, untransferable or locked).
- Its `stop` says what stops every claim on an open listing right now (`listingStop()`), and the page disables Accept on either. `blocked` is a fault on the poster's side: `posterBlocked()` holds, or less than a unit is free or in a trade. `busy` means a unit is there but trades hold so much of it that less than a unit is free, which the page shows everyone as a note to wait.
- A filled listing names the COSMO account behind its latest completed trade and counts its completed trades.

| `viewer` role        | Who                                                   | Carries                                                                                                                               |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `anonymous`          | signed out                                            | nothing                                                                                                                               |
| `closed`             | anyone signed in, on a closed listing                 | the latest trade from it the viewer was a party to                                                                                    |
| `poster`             | the poster, on an open listing                        | the pending offers and every trade the listing started                                                                                |
| `claimer`, `offerer` | a viewer with a live trade or a pending offer from it | that trade or offer (a claimer holds at most one); an offerer's has both sides' tokens, so the page can say another trade took a pick |
| `unlinked`           | anyone else without a COSMO link                      | nothing                                                                                                                               |
| `candidate`          | anyone else                                           | what they can take and what they hold for it                                                                                          |

- The poster's offers each carry the claimer, both sides' tokens with serials, the expiry and whether it can be accepted now (`offerRefusal()`, in `$acceptOffer`'s order and with its codes). The page reads the indexer once, the claimers' caps in one grouped statement and the locks by address.
- The poster's trades come from one query (`readListingTrades()`): each with when it was accepted and the pool tokens it took, a live one with what the poster still has to send and whether it waits on them, a disputed one with the dispute that froze it.
- A candidate gets the most units they can take (`allocateUnits()`, bounded by the free pool, the caps and their holdings), and per want row how many matching objekts they own and how many it is short.
- A candidate also gets how their latest offer on the listing ended when the poster or the listing ended it (`endedOffer()`: declined, expired or stale), which the page shows over the picker. One read of their latest trade on the listing finds that and any live trade or pending offer.
- The picker starts every want row empty and the viewer fills it from their collection; stepping the units down trims each row's picks to its new count. A refetch keeps both sides' picks unless the terms or the most units changed, and drops a pool pick that's no longer free.
- Only a candidate's read touches holdings, and the claim cap only stops a listing that claims at once.

## The poster's tabs

The poster's own open listing has Listing, Offers and Trades tabs (`components/trade-listings/poster-panels.tsx`), the open one in the `tab` search param (`listingSearchSchema`), left out of the URL for Listing. The header keeps Edit and Withdraw on every tab and says the listing is theirs, when they posted it and when it last changed.

| Tab     | Shows                                                                                                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listing | both sides, each objekt with how it stands and who has it (`poolStanding()`); on a listing with a ratio, the want rows say how many of the poster's they are for |
| Offers  | while the listing takes offers or one is still pending: each offer's claimer and rating, its ratio, both sides with serials, its expiry                          |
| Trades  | the live trades, each saying where it stands as My trades does, then the finished ones, each opening its trade page                                              |

- `poolStanding()` reads free, in a live trade from the listing (naming its claimer) or from elsewhere, sent (already sent in a live trade from the listing, so the drain marks it leaving the pool), traded (naming who it went to), gone (it left the pool in no trade, so it left the poster's account) or blocked with its reason.
- A token that left the pool went in the newest trade holding it that was accepted by then and hadn't ended before, so one traded, offered again in an edit and then moved is gone.
- Accept and Decline go through the trade page's offer dialog. An offer `offerRefusal()` refuses says why in `$acceptOffer`'s words told to the poster (`formatOfferRefusal()`), naming the claimer of the listing's own trade that holds a pick, and can only be declined.
- Offers counts the pending offers and Trades the live trades (`posterTabCounts()`); a tab the listing no longer has falls back to Listing (`shownPosterTab()`).

## Claims

`$claimListing` runs `preflightClaim()` without locks, then `lockAndRecheck()` and `insertTrade()` in one transaction (`lib/server/trades/claim.server.ts`). A listing with no range row is claimed at once:

- The claim becomes an `accepted` trade with `deadline_at = now() + CLAIM_WINDOW` (48 h), all its items live, an `accepted` event and `listing_claimed` to the poster.
- Claims on one listing serialise on its row lock (`FOR NO KEY UPDATE`, which conflicts with itself), while the trades they create run side by side.
- A claimer holds at most one open trade or pending offer per listing (`listing_claim_exists`).

Refusals are checked in a fixed order, so the same request always gets the same answer:

1. `listing_not_found`, then `listing_own`, then `listing_closed` or `listing_updated` against the `updated_at` the claimer saw.
2. `listing_unavailable` when `posterBlocked()` stops any claim: a payment want, the poster gone or banned, or their link no longer matching `from_address`.
3. `claim_assignment_invalid` when a pick isn't in the pool or the picks aren't a whole number of units.
4. `listing_pick_unavailable { tokenId }` for a pick the poster can't give now.
5. `claim_token_unavailable { tokenId, reason: "not_owned" }` for a claimer token the indexer doesn't know.
6. `claim_assignment_invalid` when the per-row token lists don't fit the rows scaled to the units (`validateAssignment()`).
7. `claim_token_unavailable { tokenId, reason }` for a claimer token that isn't theirs or can't move.
8. Under the lock: both users are locked `FOR NO KEY UPDATE` and their links re-read, then the listing row is locked behind its status and `updated_at` guard, which refuses as in step 1.
9. Under the lock: `listing_unavailable` again, `listing_pick_unavailable` for a pick locked or live since, `forbidden` for a banned claimer, `cosmo_not_linked` for one who relinked.
10. Under the lock: `listing_claim_exists`, then `claim_cap_reached` (claims only, see [feedback.md](feedback.md)), then `claim_token_unavailable` for a claimer token locked or live since.
11. Inserting the items maps a live-token index clash to `listing_pick_unavailable` or `claim_token_unavailable` (`refuseLiveClash()`).

- A refused poster or pick in preflight first re-reads the listing's status (`refuseAfterRecheck`), so a commit since the read gets the better answer.

## Offers on range listings

A listing with any range row takes offers instead of claims (`takesOffers()`), because a range matches many serials and only the poster knows which they meant.

- The same `$claimListing` request, through the same checks and locks except the claim cap, creates a `pending` trade with `proposed_by = to`, `expires_at = now() + OFFER_WINDOW` (72 h), nothing live, an `offered` event and `offer_received` to the poster. It returns `{ tradeId, pending: true }`.
- The decision is made from the wants as preflight read them. The lock's `updated_at` guard guarantees they haven't changed since.
- Nothing is reserved, so several offers on one listing may pick the same tokens.
- The poster accepts or declines it and the claimer may withdraw it, through the offer functions ([offers.md](offers.md)). It can't be countered.

## Accepting an offer on a listing

`$acceptOffer` reads the indexer for both sides and the listing's terms (`readListingTerms()`) before the transaction. It then locks both users `FOR NO KEY UPDATE`, the offer, then the listing, refusing `listing_closed` once it isn't open. `recheckListingOffer()` reads the pool, the links, both sides' locks and live trades and the claimer's cap under those locks, and refuses as `offerRefusal()` decides, the verdict the poster's Offers tab shows:

1. `offer_expired` once `expires_at <= now()`.
2. `listing_updated` when the picks are no longer in the pool or a whole number of the current units (`listingOfferRefusal()`).
3. `offer_unavailable { tokenId }` for a claimer token the indexer doesn't know.
4. `listing_updated` when the claimer's tokens don't fill the current rows scaled to those units exactly. The tokens are allocated afresh with `fillsExactly()`, because the trade doesn't store which row each was for.
5. `cosmo_not_linked` when `posterBlocked()` holds for the poster.
6. `listing_pick_unavailable` for a pick live in another trade; `claim_token_unavailable` naming why for any other undeliverable pick.
7. `offer_unavailable` when the claimer is gone, banned, relinked or at their claim cap, without saying which, so the poster learns none of them.
8. `offer_unavailable { tokenId }` for a claimer token that is no longer theirs to give, without saying why.

It then becomes `accepted` with the claim window. The poster's picks go live first, so a live-token clash names the right side, then the claimer's. The claimer hears `offer_accepted`.
