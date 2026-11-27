# Listings and claims

A listing offers a pool of the poster's tokens in units, or, as a buy listing, a payment for up to its most units, and stays open while the trades claimed from it run beside it.

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
        listingClosing(units, pool, live, completed, completedUnits)
          a trade still live -------------------------------> stays open
          pool: pool >= unit_size --------------------------> stays open
                else one of its trades completed -----------> filled
                else ---------------------------------------> broken
          buy:  completedUnits >= max_units ----------------> filled
                else ---------------------------------------> stays open
                                                  listing_closed -> poster
```

| Pool change                                                         | Effect                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| a trade completes                                                   | its picks get `left_at`; on a buy listing its `units` count toward `max_units`                  |
| a trade is cancelled or times out                                   | nothing; the picks it hadn't sent never left the pool, and a buy listing's units are free again |
| the drain sees a pool token leave the poster or turn untransferable | `left_at`, `updated_at` bumped                                                                  |
| the poster edits                                                    | rows still in the pool and all wants replaced, `updated_at` bumped, pending offers turn `stale` |

- A listing never reopens and never expires.
- `listingClosing()` waits while a trade is live because a poster sending a pick to its claimer also leaves the poster, so the drain drops that pick from the pool before the trade completes. A trade is live by its status, read through the item that carries the listing's id (`listingPoolState` in `sql.ts`), since a buy listing's trade has no live poster item.
- A buy listing never breaks: it has no pool to lose, so it stays open until its completed units reach `max_units` or the poster withdraws it.
- `closeSpentListings` applies the rule after every trade ends and after every drain drop. The web app runs it in `endTrade()`; the drain and `trade-timers` run it once per batch, after every trade the batch ends.
- Every break sends `listing_closed` to the poster in the same transaction unless they are banned. It names the token when the drain dropped one, and none when a cancelled or timed-out trade left the listing broken, since no single token did. A fill notifies nobody.
- `claimed` and `timed_out` are listing statuses nothing writes: no listing holds `claimed`, which stays a `trade_offer_status` value, and `timed_out` marks older listings that closed when their one trade timed out.

## Posting, editing, withdrawing

- **Post** (`$postListing`): `checkTerms()` refuses a payment currency without a rate (`unsupported_currency`), resolves the wants and checks every offered token against the indexer before the transaction. It refuses `listing_range_empty` when any one range matches no collection, so a dead range can't hide behind a live one in its row. The transaction locks the poster, re-checks the tokens for locks and live trades (`recheckTokens()`) and inserts the listing, its pool rows and its wants.
- A token the poster can't offer comes back as a `token_unavailable` result naming it, not as a thrown error, so the composer can show the serial.
- A token may sit in several open listings at once. Only a live trade reserves it.
- **Edit** (`$editListing`): replaces the listing arrays, pinned address, unit size or most units, note, payment columns, the pool rows still in the pool and the wants in one transaction. It leaves `bumped_at` alone, so the listing keeps its place in the feed.
- Under the listing's lock an edit is judged against its trades (`editUnitsRefusal()`, `refuseUnitsChange()`). A listing with no live or completed trade may turn from a pool listing into a buy listing or back; one with such a trade keeps its kind (`listing_kind_fixed`), because its trades decide how it closes, and a completed buy trade would make a pool that runs dry read as filled.
- A buy listing's most units can't drop below the units its live and completed trades fill, or to its completed ones alone, which would leave it full with nothing live to close it (`listing_units_taken`).
- An edit leaves its live trades alone, since they hold their own copies. It may keep a token that is live in one of the listing's own trades (`readWebTokenFlags()` with `editedListing`).
- The composer's reads, `$fetchOfferedTokenRefusals` and `$fetchTradeTokenStates`, take the edited listing too once the server confirms it is the caller's, so neither flags nor greys out what Save would keep.
- An edit turns the listing's pending offers `stale` (event `{ type: "stale", reason: "edited" }`, `offer_stale` to each claimer). An offer sent after the edit read them refuses the edit with `listing_updated`.
- **Withdraw** (`$withdrawListing`): `open -> withdrawn`. Its pending offers are declined `by: "listing"` with `offer_declined` to each claimer, and its live trades carry on. An offer sent after the withdrawal read them is left for `trade-timers` to decline.
- A ban or an account deletion closes the poster's listings in the same transaction (see [lifecycle.md](lifecycle.md#bans-and-account-deletion)).
- A listing's `updated_at` moves on an edit, a drain drop and every status change. Claims, offers and completions leave it alone, since the tokens they touch were already out of the free pool, and so does a bump, which changes no terms.

## Bumping

`$bumpListing` sets an open listing's `bumped_at` to the database clock, which moves it to the top of the feed.

- Only the poster can bump, at most once per `BUMP_COOLDOWN` (24 h) since the listing was posted or last bumped, so a new listing can't be bumped on its first day. The guard is in the `UPDATE`'s `WHERE`, so two bumps racing land once and the other is refused `listing_bump_too_soon`.
- A bump keeps `updated_at` as it was (it sets the column to itself to skip `$onUpdate`), so a claim made on the listing as the claimer saw it still lands.
- The page's Bump button (`bump-listing-button.tsx`) is disabled until the cooldown ends on the browser's clock, counting down to it, and renders disabled on the server and during hydration. A browser clock ahead of the database's gets the refusal as a toast.

## The composer

`components/trade-listings/listing-composer.tsx`, with its form helpers in `lib/universal/trade-listing-form.ts`, edits the posting input directly, and its UI speaks in ratios, never units.

- The Ratio control shows once the want rows ask for something and two or more objekts are offered, or when an edit's ratio takes more than the pool holds. The poster steps their side, the unit size, from 1 to the pool's size; the other side is the want rows' total, shown with how many trades the pool makes.
- The form's unit size is none, a bundle that takes the whole pool however the pool changes, or a number, and Post and Save send it. A new listing starts as a bundle, and stepping the ratio up to the pool's size makes it one again (`stepUnitSize()`).
- A number never grows: removing objekts holds it to the smaller pool, but not below 1, and adding them leaves it be (`followUnitSize()`), so a ratio that met the pool stays a ratio when the poster restocks.
- An edit prefills the pool, the listing's own live objekts included and the tokens that left it not, and the unit size only when the listing has a ratio (`hasRatio()`, `listingToFormValues()`).
- An edit's unit size isn't held to the pool, because tokens sent in a live trade leave the pool while that trade keeps the listing open. When the pool holds less than a trade takes, the Ratio control shows and Save waits for the poster to lower the ratio or add objekts.
- An "any of" row is filled through the collection search exact rows use, its collections shown as removable cards, with a count.
- A range row holds 1 to `MAX_RANGE_CLAUSES` ranges, each with its own chips and "or" between them, and matches an objekt that any of them matches.
- "Add selection" adds a range up to the cap, and every range but a lone one has a remove button.
- A range that matches no collection is marked under its own chips.
- The row's summary and match count cover every range, counting a collection in several ranges once.
- A poster needs another range only when one range would match too much: `tripleS · Atom02 · (First or Double)` is one range, while `SeoYeon · Atom02 · First` or `SeoYeon · Binary02 · Double` is two.
- A range can pick several artists and matches an objekt from any of them. Its member, season and class chips list only the picked artists' values; adding an artist keeps the range's values and removing one drops those no remaining artist has (`setRangeArtists()`). Members that leave a picked artist with none of its own hold Post back (`range_artist_unused` in `composerBlock()`), since that artist would add nothing.
- The first range row carries a note that the listing will take offers, so the poster picks the objekts, and points to "any of" for specific collections.
- A Post or Save that gives a listing its first range row (a new one with a range row, or an edit that adds the first) opens a dialog explaining offers first (`composer-range-confirm.tsx`); ticking "Open to offers" is the poster's own choice, so it opens none. Back returns to the form, where the poster can make the row an "any of" instead, and its "Don't show this again" box dismisses the `range-offers-notice` ([feedback.md](feedback.md#notices)).
- The footer holds Post and Save back with a translated reason for what the schema refuses (`composerBlock()`): a range with nothing narrowed or a column over `MAX_RANGE_VALUES`, a range that matches no collection, one range twice in a row, two range rows holding the same ranges (`rangesDistinct()`), an "any of" row with fewer than two or more than `MAX_CHOICE_OPTIONS` collections or one collection twice, two rows naming the same set (`choicesDistinct()`), a unit size over the pool. Every row's count goes into the total the steppers keep under `MAX_TOTAL_WANTED`.
- Ranges are compared as Post sends them: a range naming one artist's whole roster is sent as that artist (`collapseWholeGroup()`), so the footer collapses each range with the rosters before comparing, and `tripleS` beside `tripleS` with all its members is held back as a repeat.
- A collection the indexer doesn't know is refused by the server with `listing_want_unknown`.
- A payment is a row beside the want rows, kept last, that the claimer pays for each trade, or a payment the poster adds under their objekts, paid on top in every trade. A payment on one side disables the other side's Payment button, since a listing has one payment.
- The poster's payment with no objekts offered is a buy listing: the row reads "Paying", the Ratio control gives way to "Buying up to", stepping its most units from 1 to `MAX_BUY_UNITS`, and the form holds `maxUnits` exactly while that holds (`followMaxUnits()`), so adding an objekt or removing the payment drops it. Adding an objekt also unticks "Open to offers", since a payment on top of objekts is a fixed price.
- Either payment shows the payment strip: the listing's currency (the poster's display currency to start) and the methods it accepts, Other included. Handles are swapped in the trade chat, so the listing holds none. The footer holds Post back until the amount reads with at most two decimals and a method is picked.
- The strip's "Open to offers" box shows for the claimer's payment and a buy listing's (`paymentTakesOffers()`), but not for the poster's payment on top of their objekts, which is always a fixed price. Ticked, the amount is an asking price (`price_or_offer`), and an empty amount leaves none, so the listing only takes offers (`offer_only`); `paymentPricing()` sets the amounts and the mode together. A new payment starts unticked, a fixed price.
- The input schema takes the claimer's payment as a `payment` want row and the poster's as `offeredPayment`, each an object whose `amount` may be left out, with `payment` holding the currency, methods and offer mode; it parses them into one `payment` with its side (`withPaymentRules()` in `listing.ts`), and `formValuesToInput()` turns that back into the input the server parses again. An amount is left out exactly when the mode is `offer_only`.
- The Ratio control also shows for a sale, whose want side is its price. With no asking price, or with several options, which trade at several ratios, it shows only the poster's side.
- What the poster is looking for is 1 to `MAX_LISTING_OPTIONS` options, each its own box of rows with "or" between them (`composer-want-rows.tsx`); the claimer gives one. "Add option" sits on the "You're looking for" line while there is one option, so a one-option form is as tall as a listing without options, and under the boxes once there are several, where each box is named and can be removed. On phones an option's Payment button sits on its box's heading line rather than beside Exact, Any of and Range, for the same reason.
- The form holds `options`, one array of rows per option, which is the input's shape: its index is the stored `option`, and each option follows the row rules on its own. Footer, Ratio and summary read the options joined by "or".
- The claimer's payment may sit in any option, at most one per option, each with its own amount; the currency, methods and "Open to offers" are the listing's. Open to offers with every amount empty is `offer_only`, so every option's payment then has no asking price, and an empty amount beside a typed one holds Post back (`paymentPricing()`). The poster's payment on top prices every option, so it rules out a payment row in any of them.
- Post waits while an option is empty (`option_empty`) or two options ask for the same rows in any order (`option_repeated`), which the schema also refuses.

## The feed

`$fetchListingFeed` (`lib/server/trades/feed.server.ts`) shows every open listing the filters match, however much of its pool live trades hold, latest `bumped_at` first; a listing leaves it once it closes.

- Pages are keyset-paged on `(bumped_at, id)` through `trade_offers_feed_idx`. The cursor carries the last row's values as its page read them rather than its id, because a bump between pages would move a looked-up cursor row to the top and repeat the feed.
- A pool lives only in the web database: a token the poster has since moved stays in it until the drain drops it, and a locked token stays in it, blocked, until the poster unlocks it or edits it out, since a lock never reaches the drain.
- Each row carries its units (`ListingSize`: a unit size, or a buy listing's most units with the units its live and completed trades hold) and how many objekts the listing has ever offered. A row with a ratio ([data-model.md](data-model.md#units)) shows it, unit size to the want rows' total, in place of the arrow; a bundle keeps the arrow.
- Each half is a fan of its first three pictures beside lines of chips (`lib/universal/listing-slip.ts`): an offered objekt or a wanted collection as its member's chip, a range as its artist, member, season, number, class and on/offline chips, a payment as its price.
- A row's lines name two collections and count the rest ("+8"), sum up a range's several seasons, numbers or classes ("5 seasons"), and stop at three lines, counting the rest on the last, so a row stays one line tall on wide screens.
- A line's gutter holds "+" before a further want row or a payment, "or" before a further range of one range row, and an option's number on its first line; a want's count sits on its first line.
- A row whose lines leave something out (`slipHides()`) expands in place, like the profile's trade rows: its chevron, or Show all on a phone card, opens a panel under each half that shows every offered token's card over its serial and every wanted collection's card over its number, wrapping as the column allows, with an "any of" row's cards under "any one of", and names every range value and payment. The panels sit inside the row's link, so an open row still opens the listing.
- A buy listing's offering half is its currency's card and its price for each unit, "$3.00 each", or "Make an offer" with no asking price. Its page shows the units left, "Up to 3" or "2 of 3 left" (`buyingText()`), and "All bought" once filled; its ratio reads "$3.00 : 1", or "an offer for 1".
- Choice rows fan their collections' pictures and name them as chips.
- A listing with several options numbers each option's first line and fans the options' pictures in order. It keeps the arrow, since its options trade at different ratios. Rows from different options never mix in one line.
- A listing's payment shows in its own currency: a sale's price as the asking half's chip, a payment beside want rows on a "+" line after them, and the poster's payment on top on a "+" line after their objekts. A price open to offers reads "$3.00 · open to offers", and no asking price "Make an offer" (`askingPriceText()`). A closed listing's page reads its price alone, or "No asking price", since it takes no more offers.
- The Type filter (`type` in the URL) narrows on `listingTypesOf()` as SQL (`typeConditions()` in `feed.server.ts`): Selling when an option asks for only the claimer's payment, Buying when the poster sends only theirs, Trade when an option asks for objekts, a payment beside them or not. A listing of "objekts or $3" matches both Trade and Selling, and its row and header show a badge for each.
- The Offering filters match only offered objekts, so they never match a buy listing; with only the navbar's artists narrowing, a buy listing matches when one of its want rows names one of them.
- The "Looking for" filter matches a listing when any one want row, so any one option, holds every narrowed value: an exact row's copied values, one of a range row's ranges in `trade_listing_want_ranges` (an empty column matches any value), or one of a choice row's collections in `trade_listing_want_options`, so the member of one range or collection and the season of another don't add up.
- A range row's card takes the picture and colour of the one member every range names (`rangeMember()`), else the logo and colour of the one artist they name (`rangeArtist()`), else stays neutral.

## Your listings on My trades

My trades' Listings tab (`$fetchMyListings`, `components/trades/my-listings.tsx`) shows the viewer's open listings as feed slips, paged the same way, ending with what waits on each instead of the poster.

- Only open listings show: a filled listing's trades are on the Finished tab, and a withdrawn one needs nothing.
- Each row counts its pending offers and its live trades (`listingTradeCount()` in `packages/database/src/web/sql.ts`), found through the items that keep the listing's id, as the poster's tabs count them.
- `myListingsQuery` sits under `tradeListingKey`, so listing actions and trade actions on a listing's trades refetch it, and an account change clears it.
- Each tab suspends under its own boundary keyed by the tab, so the header and tabs never wait on rows. Its skeleton (`my-trades-skeleton.tsx`) is built from the same parts as the feed and My trades rows (`components/trade-listings/slip.tsx`), filling their slots with blocks, so a change to a slip's layout belongs in those parts.

## The listing page

`$fetchTradeListing` answers the page from one read of the listing row: the public `listing` and the session's `viewer`, whose candidate takes its free count from the public pool. If any part fails, the page shows its error.

- Every listing-page query sits under `tradeListingKey`, which `removeViewerQueries()` removes on an account change. The route sets `preload: false`, since a candidate's answer reads their holdings.
- `listing` is public and never names a claimer. It carries its units (`ListingSize`) and every objekt the listing has offered, the ones that left the pool included, each once (one offered again after it left shows as its latest row).
- Each objekt says where it stands (`poolAvailability()`): `free`, `in_trade` (a live copy, whoever holds it now), `traded` (`left_at` set, with when, shown dimmed) or `blocked` (moved, untransferable or locked).
- Its `stop` says what stops every claim on an open listing right now (`listingStop()`), and the page disables Accept on either. `blocked` is a fault on the poster's side: `posterBlocked()` holds, or the pool's free and in-trade objekts together come to less than a unit (the rest locked, moved or untransferable). `busy` means a unit is there but trades hold so much of it that less than a unit is free, or hold every unit a buy listing pays for, which the page shows everyone as a note to wait.
- A buy listing's offering half is its payment, "You get" for the units a candidate takes, "You pay" for its poster and "Paying" for anyone else, with how many units it has left.
- A filled listing names the COSMO account behind its latest completed trade and counts its completed trades.

| `viewer` role        | Who                                                   | Carries                                                                                                                               |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `anonymous`          | signed out                                            | nothing                                                                                                                               |
| `closed`             | anyone signed in, on a closed listing                 | the latest trade from it the viewer was a party to                                                                                    |
| `poster`             | the poster, on an open listing                        | the pending offers and every trade the listing started                                                                                |
| `claimer`, `offerer` | a viewer with a live trade or a pending offer from it | that trade or offer (a claimer holds at most one); an offerer's has both sides' tokens, so the page can say another trade took a pick |
| `unlinked`           | anyone else without a COSMO link                      | nothing                                                                                                                               |
| `candidate`          | anyone else                                           | what they can take and what they hold for it                                                                                          |

- The poster's offers each carry the claimer, both sides' tokens with serials, the expiry and whether it can be accepted now (`offerRefusal()`, in `$acceptOffer`'s order and with its codes). The page reads the indexer once and the locks by address.
- The poster's trades come from one query (`readListingTrades()`): each with when it was accepted and the pool tokens it took, a live one with what the poster still has to send and whether it waits on them, a disputed one with the dispute that froze it.
- A candidate gets, for each option, the most units they can take giving it (`allocateUnits()`, bounded by the free pool or a buy listing's units left, `MAX_PER_ROW`, `MAX_TOTAL_WANTED` and their holdings), and per want row how many matching objekts they own and how many it is short. One holdings read covers every option's rows.
- On a listing with several options the picker starts with an option picker (`option-picker.tsx`), each option saying whether giving it claims or sends an offer; it starts on the first option the candidate can fill. The page reads the listing at the chosen option (`listingAt()`), and switching option starts the picks over. Everyone else sees every option in its own box with "or" between them (`WantList`).
- A candidate also gets how their latest offer on the listing ended when the poster or the listing ended it (`endedOffer()`: declined, expired or stale), which the page shows over the picker. One read of their latest trade on the listing finds that and any live trade or pending offer.
- The picker starts with nothing picked: the viewer fills each want row from their collection and, on a listing with a ratio, picks which pool objekts they get; a bundle takes its whole pool. Stepping the units down trims both sides' picks to the new count, and a refetch keeps them unless the terms or the most units changed, dropping a pool pick that's no longer free.
- A row's picker lists only the objekts that fit the row, matched as `fitsWant()` and the holdings reads (`readCandidates()`) match them: a range row's ranges by their columns, an exact or "any of" row's collections by slug. `RowPicker` hands `ObjektPicker` a `rangeFilterObjektsQuery` built from `wantMatch()`, and `$fetchRangeFilterObjekts` ORs the ranges and slugs (`withWantMatch()`) under the viewer's own filters, with no navbar artists. `wantScope()` only shapes the filter panel and artist switch.
- `useListingPicks().toggle()` refuses a pick that fails `fitsWant()`, the rule the server checks, as a guard behind the picker.
- A short want row shows what it still needs greyed out, the wanted objekt or every collection an "any of" row takes, while a range row crosses out its short slots. An exact row's open slots show its objekt dimmed.
- Only a candidate's read touches holdings.
- The picker's buttons follow `listingAcceptance()` for the chosen option: Accept on an option that claims, Send offer on one that only takes offers, and Make an offer beside Accept on one open to offers. The confirm dialog takes the amount offered per trade when the listing takes offers on its payment. An amount equal to the asking price of a listing open to offers turns it back into Accept. With a range row an empty amount offers the asking price; without one an offer needs an amount, since Accept already claims at that price.

## The poster's tabs

The poster's own open listing has Listing, Offers and Trades tabs (`components/trade-listings/poster-panels.tsx`), the open one in the `tab` search param (`listingSearchSchema`), left out of the URL for Listing. The header keeps Edit, Bump and Withdraw on every tab and says the listing is theirs, when they posted it and when it last changed.

| Tab     | Shows                                                                                                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listing | both sides, each objekt with how it stands and who has it (`poolStanding()`); on a listing with a ratio, the want rows say how many of the poster's they are for                   |
| Offers  | while any option takes offers: each offer's claimer and rating, the option it gives when there are several, its ratio, both sides with serials and the offered payment, its expiry |
| Trades  | the live trades, each saying where it stands as My trades does, then the finished ones, each opening its trade page                                                                |

- `poolStanding()` reads free, in a live trade from the listing (naming its claimer) or from elsewhere, sent (already sent in a live trade from the listing, so the drain marks it leaving the pool), traded (naming who it went to), gone (it left the pool in no trade, so it left the poster's account) or blocked with its reason.
- For a token that left the pool, `poolStanding()` looks for the newest trade that holds it and was live when it left: one that is still live reads as sent, a completed one as traded, and anything else as gone. So a token traded once, offered again in an edit and then moved out of the account reads as gone.
- Accept and Decline go through the trade page's offer dialog. An offer `offerRefusal()` refuses says why in `$acceptOffer`'s words told to the poster (`formatOfferRefusal()`), naming the claimer of the listing's own trade that holds a pick, and can only be declined.
- Offers counts the pending offers and Trades the live trades (`posterTabCounts()`); a tab the listing no longer has falls back to Listing (`shownPosterTab()`).

## Claims

`$claimListing` runs `preflightClaim()` without locks, then `lockAndRecheck()` and `insertTrade()` in one transaction (`lib/server/trades/claim.server.ts`). Whether the request claims at once or sends an offer is `claimTerms()` ([Offers on listings](#offers-on-listings)). A claim:

- The trade records the option it gives in `listing_option`.
- The claim becomes an `accepted` trade with `deadline_at = now() + CLAIM_WINDOW` (48 h), all its objekt items live, an `accepted` event and `listing_claimed` to the poster.
- A listing with a payment adds the trade's payment item, the asking price times the units claimed, sent by the listing's `payment_side` and never live ([data-model.md](data-model.md#payments)). A sale's claim gives no tokens, so its `rows` are empty.
- A buy listing's claim picks nothing from a pool, so its `picked` is empty, and its trade records the units it fills in `units`. The seller sends their objekts on chain, the poster pays outside Apollo, and the seller marks the payment received.
- Claims on one listing serialise on its row lock (`FOR NO KEY UPDATE`, which conflicts with itself), while the trades they create run side by side.
- A claimer holds at most one open trade or pending offer per listing (`listing_claim_exists`).

Refusals are checked in a fixed order, so the same request always gets the same answer:

1. `listing_not_found`, then `listing_own`, then `listing_closed` or `listing_updated` against the `updated_at` the claimer saw.
2. `listing_unavailable` when `posterBlocked()` (`lib/server/trades/poster.server.ts`) stops any claim: the poster gone or banned, or their link no longer matching `from_address`.
3. `claim_assignment_invalid` when a pick isn't in the pool, the picks aren't a whole number of units (or are any at all on a buy listing), the listing has no such option, or the request carries an amount the option doesn't take (`claimTerms()` gives null). An option an edit removed is refused earlier, as `listing_updated`.
4. `listing_pick_unavailable { tokenId }` for a pick the poster can't give now.
5. `claim_token_unavailable { tokenId, reason: "not_owned" }` for a claimer token the indexer doesn't know.
6. `claim_assignment_invalid` when the per-row token lists don't fit the option's rows scaled to the units (`validateAssignment()`).
7. `claim_token_unavailable { tokenId, reason }` for a claimer token that isn't theirs or can't move.
8. Under the lock: both users are locked `FOR NO KEY UPDATE` and their links re-read, then the listing row is locked behind its status and `updated_at` guard, which refuses as in step 1.
9. Under the lock: `listing_unavailable` again, `listing_pick_unavailable` for a pick locked or live since, `listing_full` when a buy listing's live and completed trades leave fewer units than the claim takes (`unitsLeft()`, read with the listing's lock), `forbidden` for a banned claimer, `cosmo_not_linked` for one who relinked.
10. Under the lock: `listing_claim_exists`, then `claim_token_unavailable` for a claimer token locked or live since.
11. Inserting the items maps a live-token index clash to `listing_pick_unavailable` or `claim_token_unavailable` (`refuseLiveClash()`).

- A refused poster or pick in preflight first re-reads the listing's status (`refuseAfterRecheck`), so a commit since the read gets the better answer.

## Offers on listings

Acceptance is decided per option: an option takes offers (`listingAcceptance()` is `offer`, or `either` beside claims) when it has a range row, because a range matches many serials and only the poster knows which they meant, or when it carries a payment, the claimer's or a buy listing's, whose offer mode lets the claimer name the amount. An option without the payment ignores the mode, so "any Special objekt or $3 fixed" claims the $3 at once and sends the Special pick as an offer. `claimTerms()` decides each request from the chosen option and the amount per unit it carries, if any:

| Option                                      | No amount                                                       | An amount                                                        |
| ------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| no payment, or a fixed price (`price_only`) | a claim, or an offer with a range row                           | refused                                                          |
| open to offers (`price_or_offer`)           | a claim at the asking price, or an offer at it with a range row | an offer at that amount; the asking price itself is as no amount |
| offer only (`offer_only`)                   | refused                                                         | an offer at that amount                                          |

- An offer is the same `$claimListing` request, through the same checks and locks, and creates a `pending` trade with `proposed_by = to`, `expires_at = now() + OFFER_WINDOW` (72 h), nothing live, an `offered` event and `offer_received` to the poster. It returns `{ tradeId, pending: true }`.
- Its payment item holds the offered amount times its units, so accepting it starts the trade at that amount, and the poster's Offers tab, My trades and the notification emails read it from there.
- The claimer always names the amount, whichever side sends it: on a buy listing it is what the poster pays per unit, and the confirm dialog takes it under "You get". The poster's payment on top of their objekts is always a fixed price, so an offer on such a listing never names what the poster pays.
- Claim or offer is decided from the option's wants and payment as `preflightClaim()` read them; the lock's `updated_at` guard guarantees they haven't changed since.
- Nothing is reserved, so several offers on one listing may pick the same tokens.
- The poster accepts or declines it and the claimer may withdraw it, through the offer functions ([offers.md](offers.md)). It can't be countered.

## Accepting an offer on a listing

`$acceptOffer` reads the indexer for both sides and the listing's terms, every option's (`readListingTerms()`), before the transaction, and judges the offer against the option its `listing_option` names. It then locks both users `FOR NO KEY UPDATE`, the offer, then the listing, refusing `listing_closed` once it isn't open. `recheckListingOffer()` reads the pool, a buy listing's taken units, the links, both sides' locks and live trades under those locks, and refuses as `offerRefusal()` decides, the verdict the poster's Offers tab shows:

1. `offer_expired` once `expires_at <= now()`.
2. `listing_updated` when the option is gone, the picks are no longer in the pool or a whole number of the current units (`offerUnits()`: a buy listing's offer takes the units it recorded and no picks), or the offer's payment no longer fits the listing's: a payment gained or lost, another side or currency, or another amount than a fixed price times the units (`listingOfferRefusal()`, `paymentFits()`).
3. `offer_unavailable { tokenId }` for a claimer token the indexer doesn't know.
4. `listing_updated` when the claimer's tokens don't fill the option's current rows scaled to those units exactly. The tokens are allocated afresh with `fillsExactly()`, because the trade doesn't store which row each was for.
5. `cosmo_not_linked` when `posterBlocked()` holds for the poster.
6. `listing_full` when a buy listing's live and completed trades leave fewer units than the offer takes, since a pending offer held none.
7. `listing_pick_unavailable` for a pick live in another trade; `claim_token_unavailable` naming why for any other undeliverable pick.
8. `offer_unavailable` when the claimer is gone, banned or relinked, without saying which, so the poster learns none of them.
9. `offer_unavailable { tokenId }` for a claimer token that is no longer theirs to give, without saying why.

It then becomes `accepted` with the claim window. The poster's picks go live first, so a live-token clash names the right side, then the claimer's. The claimer hears `offer_accepted`.
