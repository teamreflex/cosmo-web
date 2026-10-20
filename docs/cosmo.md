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
- `objekt.transferable` is false for an objekt COSMO won't let its owner send, such as a First class objekt locked by a completed grid. Apollo's trades only take transferable objekts, since every trade settles through transfers the parties make in COSMO (see `docs/trades.md`).
- A token id below the first Abstract-native mint (9,419,276) doesn't mean the objekt was minted on Polygon: physicals keep the id reserved when they were printed, so Atom02 A objekts carry 8–9M ids yet were scanned on Abstract in late 2025. Split Polygon-range ids by `on_offline`: online ones were minted on Polygon, offline ones need checking on-chain.

## Serials

COSMO numbers objekts differently per kind:

- **Online (Z) objekts are minted on the fly.** Token id is a global mint counter and serial is a per-collection mint counter, so serial order follows token id order. Grid rewards mint the same way; there are no reserved pools for Z. Polygon-era gaps are permanent: objekts spun on Polygon were never re-minted when COSMO migrated chains, so counting serials from 1 is wrong for old collections (e.g. cream01-mobius-club-321z has 8,889 rows but a max serial of 12,483).
- **Offline (A) objekts are reserved as token-id ranges per print batch** before the physical is scanned. A reservation shows up as a range of ids with no online mints in it, allocated in 100-id chunks (some in 50s); a range shared by several collections splits between them on 50s. Inside a chunk `id - serial` is constant, and serials carry on across a collection's chunks in reservation order, counting ids nobody has scanned yet. Reprints get a later range (every atom02-*-352a got one ~2,000 ids after the first).
- **Coupon sets are the only Z exception.** A range of ids and serials is allocated when QR coupons are printed and minted on redemption, so they follow the offline model and unredeemed coupons leave holes. Known sets: ARTMS `binary01-{choerry,haseul,heejin,jinsoul,kimlip}-312z`; OEC `atom01-{choerry,jinsoul,kimlip}-{213z,338z}`; `cream02-{hayeon,jiwoo,jiyeon,kotone,xinyu,yeonji}-315z`; `atom02-{chaewon,hayeon,jiyeon,kotone,lynn,nien,shion,yooyeon}-375z`. `cream01-*-308z` were coupon sets too but finished before the cutoff. The collection number is not a signal — regular collections use 312/315/338/375 too.
- **Claim blocks mix the two.** COSMO can allocate a digital collection a block of serials in 100-id chunks, like a print run, and mint them as claims over the following months while ordinary mints carry on above it. The block's whole width counts towards later serials, claimed or not. Each atom02-{heejin,haseul,kimlip,jinsoul,choerry}-101z got 400 on 2026-07-15. They're listed in `CLAIM_BLOCKS` in `@apollo/serial-estimation`, and `scripts/claim-blocks.ts` finds new ones.
- COSMO's counter is not perfectly monotonic. Serials occasionally permute within one mint transaction (±1 on ~0.2% of pairs), and COSMO sometimes assigns a serial without ever minting the objekt, mostly on incident days. Neither shows up on-chain.

### Serial sources

The indexer stores `objektNo` from COSMO's token metadata. COSMO's v1 API (`api.cosmo.fans/objekt/v1/*`) is gone, and the v3 metadata endpoint (`/bff/v3/objekts/nft-metadata/{id}`) has no serial — the `#N` in its `name` is the token id — so the v3 normalization in `packages/cosmo` stores serial `0`. The last real serial was minted at 2026-06-04 08:07:05 UTC (`SERIAL_CUTOFF` in `@apollo/serial-estimation`); the cutoff is a mint time rather than a token id because physicals are scanned long after their ids are reserved. Nothing on-chain carries a serial: `mint`/`mintBatch` take none and no event emits one. The remaining sources are the COSMO app itself (users reading their own objekts, or traffic captured via `apps/proxy`) or MODHAUS restoring `objektNo` in v3.

### Estimated serials

Every serial on an objekt minted after the cutoff is an estimate from `@apollo/serial-estimation`, unless `serial_confirmation` holds its real serial. There is no per-row marker: the cutoff is the marker.

- Digital collections are numbered in token-id order, continuing from the last real or confirmed serial, or from #1 for a collection that started after the cutoff.
- Physical collections and coupon sets are numbered by position in their chunk, from a known serial in the same chunk, else chained through the collection's other chunks. `serial_reservation` holds the reserved ranges: the backfill seeds it from every online mint, and the processor keeps it equal to that: an online mint landing 20 or more ids above the highest one so far opens a range, and a late online mint (minted after ids above it) splits the range it lands in.
- `serial_confirmation` holds real serials reported by users, entered by staff at `/admin/serials`. A confirmation fixes its objekt and re-anchors the rest of the collection; `apps/schedules` applies new ones every 5 minutes.
- The indexer sets each new objekt's serial as it inserts it. Mints don't reach the chain in token-id order: under load, a batch of lower ids can land a few seconds after higher ones in the same collection, which shifts every digital objekt above it, so the indexer renumbers those stored rows in the same batch. It never renumbers stored physicals. `apps/schedules` recomputes every collection with an objekt minted in the last day, daily at 08:00 Pacific/Auckland, which repairs what insertion can't. A collection with nothing new is only recomputed when a confirmation lands in it.
- Measured by hiding real serials after a pretend cutoff (`packages/serial-estimation/scripts/accuracy.ts`): physicals are ~99% exact, digital collections that started after the cutoff ~98.5% exact and 99.7% within ±2, and older digital collections drift lower over months (95% exact, 99% within ±2 five months out) because of serials COSMO assigned without minting. One confirmation removes the drift before it.

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
