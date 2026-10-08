# COSMO — Domain Concepts

Apollo mirrors data from MODHAUS' COSMO app and the Abstract blockchain. This file describes how COSMO's objekts, serials, grids, COMO and gravities work, including the parts COSMO doesn't document and that we've established from on-chain data.

## Collections

A `collection` represents a type of objekt. Properties on a collection:

- the group it belongs to, e.g. tripleS, ARTMS
- the member, e.g. Seoyeon, Heejin
- the season it is part of, e.g. Atom01, Binary01, Cream01
- the class of objekt, e.g. First, Double, Special, Premier, Welcome
- the number, e.g. 101Z, 201Z, 320Z, 401A
  - the suffix is one of two letters: Z or A. Z denotes a digital-only (online) objekt, A denotes a physical (offline) objekt
  - the first digit can inform the class: 1 is either Welcome or First class, 2 is Special class, 3 is Double class, 4 is Premier class
  - Welcome class objekts are always 100Z

### Unobtainable collections

Some collections can no longer be obtained: event rewards that were only handed out once, test collections and minting errors. `collection.unobtainable` marks them, and they are left out of progress totals and the progress leaderboard. The flag is set by hand once a collection is known to be unobtainable; new collections are always inserted as obtainable. Flag one with `UPDATE collection SET unobtainable = true WHERE slug = '...'` on the indexer database: triggers move its owners' leaderboard counts, and the Typesense importer picks it up on its next tick.

The database column is the source of truth. This copy of the 81 collections flagged so far is for reference:

- Test collection: `atom01-artmstest-100u`
- Minting errors: `atom01-jinsoul-109a`, `binary01-mayu-101a`, `binary01-mayu-104a`, `binary01-mayu-105a`, `binary01-mayu-106a`, `binary01-mayu-107a`, `binary01-mayu-108a`
- ARTMS 1st anniversary events: `atom01-heejin-346z`, `atom01-haseul-346z`, `atom01-kimlip-346z`, `atom01-jinsoul-346z`, `atom01-choerry-346z`
- Chilsung event: `atom01-heejin-351z`, `atom01-haseul-351z`, `atom01-kimlip-351z`, `atom01-jinsoul-351z`, `atom01-choerry-351z`
- Virtual Angel events: `binary01-heejin-310z`, `binary01-haseul-310z`, `binary01-kimlip-310z`, `binary01-jinsoul-310z`, `binary01-choerry-310z`
- Lunar Theory events: `cream01-haseul-330z`, `cream01-heejin-330z`, `cream01-kimlip-330z`, `cream01-jinsoul-330z`, `cream01-choerry-330z`
- Burn event: `cream01-heejin-333z`, `cream01-haseul-333z`, `cream01-kimlip-333z`, `cream01-jinsoul-333z`, `cream01-choerry-333z`
- Zero class: `atom01-triples-000z`, `atom01-aaa-000z`, `atom01-kre-000z`
- Self-made events: `divine01-seoyeon-312z`, `divine01-hyerin-312z`, `divine01-jiwoo-312z`, `divine01-chaeyeon-312z`, `divine01-yooyeon-312z`, `divine01-soomin-312z`, `divine01-nakyoung-312z`, `divine01-yubin-312z`, `divine01-kaede-312z`, `divine01-dahyun-312z`, `divine01-kotone-312z`, `divine01-yeonji-312z`, `divine01-nien-312z`, `divine01-sohyun-312z`, `divine01-xinyu-312z`, `divine01-mayu-312z`, `divine01-lynn-312z`, `divine01-joobin-312z`, `divine01-hayeon-312z`, `divine01-shion-312z`, `divine01-chaewon-312z`, `divine01-sullin-312z`, `divine01-seoah-312z`, `divine01-jiyeon-312z`
- Love Poison streaming event: `divine01-haseul-331z`
- Can You Entertain streaming event: `divine01-kimlip-337z`
- Ring of Chaos streaming event: `divine01-jinsoul-338z`
- Pressure streaming event: `divine01-choerry-339z`
- Savior streaming event: `divine01-heejin-340z`
- 22/05/26 minting error: `binary01-hyerin-118a`, `binary01-seoyeon-119a`, `binary01-dahyun-117a`, `binary01-chaeyeon-120a`, `binary01-yubin-118a`, `binary01-nakyoung-118a`, `binary01-kaede-120a`, `binary01-nien-120a`, `binary01-sohyun-103a`, `binary01-hyerin-120a`, `binary01-nien-118a`, `binary01-mayu-119a`, `binary01-yooyeon-118a`, `binary01-kotone-117a`, `binary01-xinyu-120a`, `atom01-heejin-111a`

## Objekts

An `objekt` is a single NFT on the Abstract blockchain. Every objekt within a collection has a unique serial number.

- Objekts users "spin" are transferred to `Addresses.SPIN`, a sink with no outgoing transfers. They are real rows owned by that address, not deletions.
- "spin" is an in-app gacha system where there's a chance of swapping an First/Double class objekt for a more valuable Special or Premier class objekt.
- `objekt.minted_at` is the timestamp of whichever transfer created the row (indexer `handleObjekt`), not necessarily the mint. A mint the indexer missed gets the timestamp of the later transfer that created the row. Check for a transfer from `0x0` before treating `minted_at` as mint evidence.
- A token id below the first Abstract-native mint (9,419,276) doesn't mean the objekt was minted on Polygon: physicals keep the id reserved when they were printed, so Atom02 A objekts carry 8–9M ids yet were scanned on Abstract in late 2025. Split Polygon-range ids by `on_offline`: online ones were minted on Polygon, offline ones need checking on-chain.

## Serials

COSMO numbers objekts differently per kind:

- **Online (Z) objekts are minted on the fly.** Token id is a global mint counter and serial is a per-collection mint counter, so serial order follows token id order and every serial has a minted objekt. Grid rewards mint the same way; there are no reserved pools for Z. A serial gap in an Abstract-era online collection means a row is missing from our database. Polygon-era gaps are permanent: objekts spun on Polygon were never re-minted when COSMO migrated chains, so counting serials from 1 is wrong for old collections (e.g. cream01-mobius-club-321z has 8,889 rows but a max serial of 12,483).
- **Offline (A) objekts are reserved as contiguous token-id blocks per print batch** before the physical is scanned. Inside a block, `id - serial` is constant; redemption date is irrelevant because the mapping is fixed at reservation. Most collections have a couple of print batches. Reprints get a second block later (every atom02-*-352a got one ~2,000 ids after the first), with the first batch's unredeemed tail in between.
- **Coupon sets are the only Z exception.** A block of ids and serials is allocated when QR coupons are printed and minted on redemption, so they follow the offline block model and unredeemed coupons leave holes. Known sets: ARTMS `binary01-{choerry,haseul,heejin,jinsoul,kimlip}-312z`; OEC `atom01-{choerry,jinsoul,kimlip}-{213z,338z}`; all 13 `cream01-*-308z`; `cream02-{hayeon,jiwoo,jiyeon,kotone,xinyu,yeonji}-315z`. The collection number is not a signal — regular collections use 308/312/315/338 too.
- COSMO's counter is not perfectly monotonic: serials occasionally permute within a same-second mint batch, regress, spike, or get burned without a mint. These are bounded and are not reservations.

### Serial sources

The indexer stores `objektNo` from COSMO's token metadata. COSMO's v1 API (`api.cosmo.fans/objekt/v1/*`) is gone, and the v3 metadata endpoint (`/bff/v3/objekts/nft-metadata/{id}`) has no serial — the `#N` in its `name` is the token id — so the v3 normalization in `packages/cosmo` stores serial `0`. Objekts with token ids above 24,582,445 therefore have no real serial. Nothing on-chain carries one either: `mint`/`mintBatch` take no serial and no event emits it, and v3 returns `OBJEKT_NOT_FOUND` for reserved-but-unminted ids. The remaining possible sources are the endpoint the COSMO app itself renders serials from (capturable via `apps/proxy`) or MODHAUS restoring `objektNo` in v3.

### Estimating serials

Measured against the real serials below 24,582,445:

- Predict from the previous known serial (the anchor) in the same collection, never by ranking from 1.
  - Offline: `anchor + (id gap) - (foreign minted rows between)`. Abstract-era physicals are 99.95% exact from one anchor and 100% when the anchors on both sides agree. Cap the distance: with fewer than 100 unminted ids between anchor and target there were no misses; past ~1,000 the target is almost always in a different print batch.
  - Online: `anchor + (own rows between)` is ~99.5% exact for Abstract-native collections. The misses are same-second batch permutations (errors of −1/+2) and counter spikes, so validate an anchor against its predecessors before using it.
- A block with no anchor that follows an online mint almost always starts at the previous minted id + 1. After another physical block, the gap is that block's unredeemed tail and shrinks as redemptions land.
- Burned serials make online estimates drift slightly low over time, and this is undetectable on-chain. Store an estimated/exact marker with any estimate.

## Grids

A `grid` is when a user collects all 8 (or 4) First class objekts for a member, segmented by season and then further segmented by edition.

- 1st edition corresponds to First class collection numbers 101 through 108 and Special class collection numbers 201 & 202
- 2nd edition corresponds to First class collection numbers 109 through 116 and Special class collection numbers 203 & 204
- 3rd edition corresponds to First class collection numbers 117 through 120 and Special class collection numbers 205 & 206
- Completing a grid locks the selected First class objekts to your account, and randomly grants you one of two corresponding Special class objekts
- Completing a grid with physical (designated A) objekts does not grant an A designation Special class, only a Z designation
- Untransferable or unsendable objekts cannot be used to complete a grid
- Exceptions to this rule are as follows:
  - tripleS Atom01 2nd edition Special class objekts were designated as 216 & 217
  - tripleS Atom01 3rd edition Special class objekts were designated as 218 & 219

## COMO

`COMO` is the currency used for voting in `gravity` events. Every objekt purchase grants some value of this, and objekts of `Special` class generate 1 COMO per month. We track COMO balances of every account via blockchain events.

## Gravity

Gravity events are polls where users can place their COMO on specific candidates. Usually these range from things such as voting for a song to release, or which members will participate in a specific group sub-unit. We provide live voting data by tracking `Voted` events on-chain, and merge in which candidate was selected per vote by tracking `Reveal` events.

- A gravity contains one or more polls. Multi-day "grand" gravities (e.g. Two Big WAVes) have one poll per day under a single gravity.
- A combination poll is a single poll where each vote makes two picks (one per slot) instead of a single choice. The vote's COMO counts once in every slot, so each slot's column sums to the poll total.
- The gravity contract has no notion of slots or pairings — every poll is a flat candidate list, so multi-pick formats enumerate each pairing as its own candidate (`HeeJin·HaSeul`, `HeeJin·KimLip`, …). No contract change is involved in adding one.
- A unit poll (`unit-poll`) races those pairings directly: COSMO reports it single-poll-shaped — plain `choices`, `selectedContent`, and `votedChoice` results — plus a `memberImages` alias→card map, and no slot metadata. Only `combination-poll` carries slots, so `buildSlotModel` gives a unit poll one implicit slot of pairings and everything downstream treats it like a single poll. The member roster is a separate request, not part of the poll payload.
- Polygon-era votes (pre-2025-04-18) live in the web database's `polygon_votes` table and are all permanently finalized; Abstract-era votes live in the indexer database's `vote` table. The aggregated vote endpoint branches per era rather than merging the two sources — fully revealed polygon polls short-circuit every live codepath, so the shared frontend components work for both.
- Every combination poll to date ran on Polygon and is fully revealed, so the live codepaths (reveal batches, slot movement, in-progress ranking) have only ever run against single polls.
- On-chain poll ids don't always match COSMO poll ids: gravity 2 uses cosmoId−1 (0–3), gravities 3/9/10/11 are identity, and gravities after 11 use `pollIdOnChain`.
- Gravities are always posted within a day or two of their start date — far-future poll start/end dates never occur.
