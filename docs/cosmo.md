# COSMO domain concepts

Apollo mirrors data from MODHAUS' COSMO app and the Abstract chain. This file covers how collections, objekts, serials, grids, COMO and gravity work, including what COSMO doesn't document and we established from on-chain data.

## Collections

A `collection` is a type of objekt. It has:

- a group (artist), e.g. tripleS, ARTMS
- a member, e.g. Seoyeon, Heejin
- a season, e.g. Atom01, Binary01, Cream01
- a class, e.g. First, Double, Special, Premier, Welcome
- a number, e.g. 101Z, 201Z, 320Z, 401A

About the number:

- `Z` marks a digital-only (online) objekt and `A` a physical (offline) one.
- The indexer sets `on_offline` to `online` only when the number contains `Z`, so an odd number such as `atom01-artmstest-100u` counts as offline.
- The first digit hints at the class: 1 is Welcome or First, 2 Special, 3 Double, 4 Premier.
- Welcome class objekts are always 100Z.

### Unobtainable collections

`collection.unobtainable` marks collections nobody can obtain any more. They are left out of progress totals and the progress leaderboard.

- The categories: test collections, minting errors, the Zero class, and one-off event rewards (anniversary, streaming, burn and self-made events).
- New collections are always inserted as obtainable; staff flag one by hand once it is known to be unobtainable.
- Flag one at `/admin/collections`, or with `UPDATE collection SET unobtainable = true WHERE slug = '...'` on the indexer database.
- Flipping the flag moves its owners' leaderboard counts (triggers on `collection`), and apps/typesense-import re-imports it on its next tick.
- The database is the only list: `SELECT slug FROM collection WHERE unobtainable ORDER BY slug`.

## Objekts

An `objekt` is one NFT on the Abstract chain. Every objekt in a collection has its own serial number.

- "Spin" is an in-app gacha that can swap a First or Double class objekt for a Special or Premier one.
- Spun objekts are transferred to `Addresses.SPIN`, a sink with no outgoing transfers. They stay real rows owned by that address, not deletions.
- `objekt.minted_at` is the time of whichever transfer created the row, not necessarily the mint. Check for a transfer from `0x0` before treating it as mint evidence.
- `objekt.transferable` is false when COSMO won't let the owner send it, e.g. a First class objekt locked by a completed grid. COSMO's v3 metadata always reports `true`, so the real value only arrives with a `batchUpdateObjektTransferability` call.
- Trades only take transferable objekts, because every trade settles through transfers the parties make in COSMO (see [`docs/trades/overview.md`](trades/overview.md)).
- A token id below the first Abstract-native mint (9,419,276) doesn't mean the objekt was minted on Polygon. Physicals keep the id reserved when they were printed, so Atom02 A objekts carry 8-9M ids yet were scanned on Abstract in late 2025.
- To split Polygon-range ids, use `on_offline`: online ones were minted on Polygon, offline ones need checking on-chain.

## Serials

COSMO numbers objekts differently per kind.

- **Online (Z) objekts are minted on the fly.** The token id is a global mint counter and the serial a per-collection one, so serial order follows token-id order. Grid rewards mint the same way.
- **Polygon-era gaps are permanent.** Objekts spun on Polygon were never re-minted when COSMO moved chains, so counting from 1 is wrong for old collections (cream01-mobius-club-321z has 8,889 rows but a max serial of 12,483).
- **Offline (A) objekts are reserved as token-id ranges per print run**, before anyone scans them. A reservation is a stretch of ids with no online mints in it, allocated in 100-id chunks (some in 50s). A range shared by several collections splits between them on 50s.
- Inside a chunk `id - serial` is constant, and serials carry on across a collection's chunks in reservation order, counting ids nobody has scanned yet. Reprints get a later range (every atom02-\*-352a got one about 2,000 ids after the first).
- **Coupon sets are the only Z exception.** Their ids and serials are allocated when the QR coupons are printed and minted on redemption, so they follow the offline model and unredeemed coupons leave holes. `COUPON_SETS` in `packages/serial-estimation/src/kind.ts` is the list. The collection number is no signal, because regular collections reuse the same numbers.
- **Claim blocks mix the two.** COSMO can allocate a digital collection a block of serials in 100-id chunks and mint them as claims over the following months, while ordinary mints carry on above it. The whole block counts towards later serials, claimed or not (each atom02-{heejin,haseul,kimlip,jinsoul,choerry}-101z holds a 400-serial block). `CLAIM_BLOCKS` in `packages/serial-estimation/src/claim-blocks.ts` is the list.
- **COSMO's counter is not perfectly monotonic.** Serials occasionally permute within one mint transaction (±1 on about 0.2% of pairs), and COSMO sometimes assigns a serial without ever minting the objekt, mostly on incident days. Neither shows on-chain.

```
  token id ->

  digital mints   o o o o                                          o o o
                        lo                                         hi
                        |<-------- reserved range (lo, hi) -------->|
                        |  gap between digital mints >= 20 ids      |
                        |                                           |
  chunks (100 ids)      [  chunk 1  ][  chunk 2  ][  chunk 3  ]
  scans of 301a          x  x   x                  x x

  serial = chunk's first serial + (id - chunk start)
  chunk's first serial: from known serials in the chunk (majority vote),
                        else chained from neighbouring chunks (+/- size),
                        else #1 at the first chunk with a scan
  unscanned chunk 2 still counts: chunk 3 starts at chunk 1's start + 200

  late digital mint at id L inside (lo, hi):
     (lo, hi)  -->  (lo, L) and (L, hi), keeping only gaps >= 20
```

### Where real serials come from

- COSMO's v1 API (`api.cosmo.fans/objekt/v1/*`) is gone. The v3 metadata endpoint (`/bff/v3/objekts/nft-metadata/{id}`) has no serial; the `#N` in its `name` is the token id.
- Nothing on-chain carries a serial: `mint` and `mintBatch` take none and no event emits one.
- The only other sources are the COSMO app itself (users reading their own objekts, or traffic captured with `apps/proxy`) or MODHAUS restoring serials in v3.

### The cutoff

- `SERIAL_CUTOFF` (2026-06-04 08:07:05 UTC) is the mint time of the last objekt with a real serial.
- It is a mint time rather than a token id, because physicals are scanned long after their ids are reserved.
- Every serial on an objekt minted after it is an estimate unless `serial_confirmation` holds the real one. There is no per-row marker; the cutoff is the marker.

### Estimated serials

`@apollo/serial-estimation` holds the rules (see [its README](../packages/serial-estimation/README.md)).

- Digital collections are numbered in token-id order, continuing from the last real or confirmed serial, or from #1 for a collection that started after the cutoff.
- Physicals and coupon sets are numbered by position in their chunk, as drawn above. `serial_reservation` holds the reserved ranges.
- `serial_confirmation` holds real serials users report, entered by staff at `/admin/serials`. A confirmation fixes its objekt and re-anchors the rest of the collection.
- Mints don't reach the chain in token-id order: under load a lower batch can land seconds after higher ids, which shifts every digital serial above it.

```
  staff                    apps/web                     indexer DB
  -----                    --------                     -------------------------
  /admin/serials  ------>  confirm a serial  -------->  serial_confirmation
                                                               |
  apps/indexer, each chunk                                     |
  new digital mints  ----> open or split ranges ------> serial_reservation
  new objekts after cutoff -> estimate, set serial ---> objekt.serial (insert)
  late digital mint  ----> renumber stored digital ---> objekt.serial (update)
                                                               ^
  apps/schedules                                               |
  apply-serial-confirmations  every 5 min: collections  -------+
                              whose confirmation != serial     |
  recompute-serials           daily 08:00 Pacific/Auckland: ---+
                              collections with a mint in the last 25 h
                              (the only repair for physicals)

  all three call estimateSerials() from @apollo/serial-estimation
```

Accuracy, measured by hiding real serials after a pretend cutoff (`packages/serial-estimation/scripts/accuracy.ts`):

| Collections                       | Exact       | Within ±2 |
| --------------------------------- | ----------- | --------- |
| physicals                         | about 99%   |           |
| digital, started after the cutoff | about 98.5% | 99.7%     |
| digital, older, five months out   | 95%         | 99%       |

- Older digital collections drift over months because of serials COSMO assigned without minting. One confirmation removes the drift before it.

## Grids

A `grid` is collecting all 8 (or 4) First class objekts of a member, per season and then per edition.

- 1st edition: First class 101-108 and Special class 201 and 202.
- 2nd edition: First class 109-116 and Special class 203 and 204.
- 3rd edition: First class 117-120 and Special class 205 and 206.
- Completing a grid locks the chosen First class objekts to the account and grants one of the two matching Special class objekts at random.
- A grid completed with physical (A) objekts grants a Z Special class, never an A one.
- Untransferable or unsendable objekts can't complete a grid.
- Exceptions: tripleS Atom01 2nd edition Specials are 216 and 217, and 3rd edition Specials are 218 and 219.

## COMO

`COMO` is the currency spent on gravity votes. Each artist has its own COMO token, and balances are tracked per owner and token from the COMO contract's transfers, leaving out the system addresses in `Addresses`.

Each objekt grants COMO by class. For tripleS and ARTMS, Premier and Special objekts grant their amount again every month while held. idntt has no monthly grants.

| tripleS and ARTMS class | COMO | Monthly |
| ----------------------- | ---- | ------- |
| First                   | 1    | no      |
| Double                  | 2    | no      |
| Premier                 | 2    | yes     |
| Special                 | 1    | yes     |
| Welcome                 | 1    | no      |
| Motion                  | 2    | no      |
| Unit                    | 4    | no      |

| idntt class | COMO |
| ----------- | ---- |
| Basic       | 1    |
| Event       | 2    |
| Special     | 6    |
| Unit        | 12   |
| Motion      | 2    |

## Gravity

Gravity events are polls where users place COMO on candidates, such as the next song to release or the members of a sub-unit.

- A vote is a `Voted` log on the gravity contract. Its candidate stays hidden until COSMO calls `reveal`.
- A `reveal` call carries a poll, a list of candidates and an offset: entry `i` is the candidate of the poll's vote at position `offset + i`, in on-chain order.
- A gravity contains one or more polls. Multi-day "grand" gravities (e.g. Two Big WAVes) have one poll per day.
- The contract has no notion of slots or pairings: every poll is a flat candidate list, so multi-pick formats enumerate each pairing as its own candidate (`HeeJin·HaSeul`, `HeeJin·KimLip`, ...).
- A combination poll (`combination-poll`) makes two picks per vote, one per slot. The vote's COMO counts once in every slot, so each slot's column sums to the poll total.
- A unit poll (`unit-poll`) races the pairings directly. COSMO reports it in the single-poll shape (plain `choices`, `selectedContent`, `votedChoice` results) plus a `memberImages` alias-to-card map, with no slot metadata. The member roster is a separate request.
- Every combination poll so far ran on Polygon and is fully revealed, so live reveal handling has only ever run against single polls.
- Votes before 2025-04-18 are Polygon-era and live in the web database's `polygon_votes`, all finalized. Later votes are Abstract-era and live in the indexer's `vote`.
- On Abstract, the on-chain poll id is COSMO's poll id.
- On Polygon, the on-chain id differs: gravity 2 uses COSMO's id minus 1, gravities up to 11 use COSMO's id, and later gravities use `pollIdOnChain` (`polygonPollId()` in `apps/web/src/lib/server/gravity.server.ts`).
- Gravities are always posted within a day or two of their start; far-future poll dates never occur.
- The web implementation (era branching, aggregation, slot model) lives in `apps/web/src/lib/server/gravity.server.ts` and `apps/web/src/lib/client/gravity/`.
