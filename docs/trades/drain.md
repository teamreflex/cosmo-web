# What the drain decides

`drain-outbox` in apps/schedules applies each batch of the indexer's `list_event_outbox` to the trade tables in one transaction (`applyTrades`); the decisions are pure, in `foldTransfers()` and `decideTransfer()` in `packages/trades/src/transfers.ts`. Batching, the cursor, exactly-once and simulation are in [apps/schedules/CLAUDE.md](../../apps/schedules/CLAUDE.md).

## One outbox row

```
  outbox row for token T (a transfer or a transferability change), in batch order
       |
       |  for every trade row holding T: live items, open listings' pool rows,
       |  pending offers' items   (holder = the item's sender's pinned address)
       v
  live item already sent ---------------------------------------> ignore
  transferability: transferable ---------------------------------> ignore
                   not transferable   live    -> token_untransferable event
                                      offered -> break (untransferable)
  transfer to the live item's pinned receiver -------------------> item sent
                   (from any wallet; chain time and tx hash recorded)
  transfer not from the holder ----------------------------------> ignore
  transfer from the holder elsewhere  live    -> token_moved event
                                      offered -> break (moved)
       |
       v
  break on a pending offer -> stale + offer_stale to its proposer
  break on a listing       -> pool row left_at, updated_at bumped
  live trade owing nothing -> completed (endTrade): its picks leave the pool
  transfer whose indexer row is gone (hash null) -> skipped for trades
       |
       v
  every listing the batch touched, once, after all its trades ended:
    closeSpentListings -> filled, or broken -> listing_closed to the poster,
                          naming the token that broke it
```

## Rules

- Only the exact token ids pinned on the trade count. A party who sends a different copy sorts it out in chat or through a dispute.
- Reaching the receiver's pinned address delivers the item from whichever wallet it came, so a sender who routes it through another of their wallets still delivers.
- An item that arrives counts as sent for later rows in the same batch, so a token passed on in one batch is recorded once and not reported as moved.
- A live trade whose token moves elsewhere or turns untransferable only gets a timeline event. Its status doesn't change and nobody is notified; the trade page shows the event.
- A disputed trade still records transfers, but only staff end it.
- A pool token that leaves the poster for anywhere, its own trade's claimer included, is dropped from every open listing offering it, live in a trade or not. That is why `listingClosing()` waits while a trade is live ([listings.md](listings.md#listing-lifecycle)).
- Each listing or pending offer breaks once per batch, on the first token that breaks it, and that token is the one its event and notification name.
- Marking an item sent is guarded by `transferred_at IS NULL`, so a replayed row can't advance a trade twice.
- A transfer whose indexer `transfer` row is gone was rolled back with a hot block and is skipped for trades ([apps/schedules/CLAUDE.md](../../apps/schedules/CLAUDE.md)).

## Order of writes

1. Lock every party and poster it may notify (`FOR KEY SHARE`), then the live trades, as [docs/locking.md](../locking.md) orders them.
2. Record arrivals on live items.
3. `breakOffers`: lock the pending offers, then the listings, turn the offers `stale`, drop the departed pool rows and bump the listings' `updated_at`.
4. End the trades left owing nothing with `endTrade`, which locks their listings after the ones step 3 locked.
5. `closeSpentListings` judges every listing steps 3 and 4 touched once, after all the batch's trades have ended. A broken one's poster hears which token closed it; a completed trade's listing can only fill.
6. Insert the timeline events and the notifications in the same transaction, and publish the touched trades on `trade-events` after the commit.

- The candidate read before the locks is unlocked. A trade that ended since is dropped by its lock, and an offer accepted since is left alone, because breaks only touch pending offers and open listings.

## Chain edge cases

- A transfer the drain recorded is never undone, even if a reorg later removes it from the chain.
- A party may cancel while a transfer is still in flight, because the cancel check reads only what the indexer has seen. The drain then ignores the transfer, since the trade is no longer live.
- A rolled-back transferability row can't be told apart from a real one, so it still breaks listings and turns offers stale.
