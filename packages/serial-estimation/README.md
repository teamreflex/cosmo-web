# @apollo/serial-estimation

Estimates the serials of objekts minted after `SERIAL_CUTOFF`, when COSMO's metadata stopped carrying them. The model (digital counters, reserved ranges, coupon sets, claim blocks) and who writes serials are in [`docs/cosmo.md`](../../docs/cosmo.md#serials).

`src/` is pure functions with no I/O. apps/indexer calls them as it inserts objekts, and apps/schedules calls them in `recompute-serials` and `apply-serial-confirmations`.

## Contract

- `estimateSerials(collection, confirmations)` returns only the serials that differ from what is stored. Confirmations always win, and objekts minted before the cutoff keep their real serial.
- `collectionKind(slug, onOffline)` picks the model: `reserved` for physicals and the `COUPON_SETS` in `src/kind.ts`, else `sequential`.
- `findReservations()` turns ascending digital token ids into the reserved ranges between them (gaps of `RESERVATION_MIN_GAP` or more). `serial_reservation` must always equal its result over every digital mint so far.
- Callers load a collection's objekts, confirmations and (for `reserved`) its reservations themselves. That loader exists in three copies: `apps/indexer/src/serials.ts`, `apps/schedules/src/functions/recompute-serials.ts` and `scripts/database.ts`. Change them together.

## Tests

- `turbo test --filter @apollo/serial-estimation` runs `bun test` over JSON fixtures of real collections in `tests/fixtures/`.
- A test hides real serials with `hideSerials()` as if minted after the cutoff, then checks the estimate against them.
- Export a new fixture with `bun scripts/export-fixture.ts <slug> [maxTokenId]`; serials after the cutoff are written as 0, because the database only holds our own estimates for them.

## Scripts

Run from this directory with `INDEXER_DATABASE_URL` set. The large scans stream through `psql`, which must be installed.

| Script                                      | Does                                                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun scripts/accuracy.ts [cutoff] [minGap]` | hides serials after a pretend cutoff, estimates them and reports accuracy; read-only                                                            |
| `bun scripts/claim-blocks.ts`               | finds candidate claim blocks in digital collections; read-only                                                                                  |
| `bun scripts/export-fixture.ts <slug>`      | writes a collection to `tests/fixtures/<slug>.json`                                                                                             |
| `bun scripts/backfill.ts reservations`      | adds every reserved range between digital mints to `serial_reservation`; keeps stored ones                                                      |
| `bun scripts/backfill.ts confirmations`     | inserts the real serials known before `/admin/serials` existed                                                                                  |
| `bun scripts/backfill.ts serials`           | estimates every collection with an objekt minted after the cutoff and writes the changed serials; resumable (`--dry-run`, `--batch`, `--pause`) |

## Changing the rules

1. Change `src/`, and add a fixture plus a test for the case that motivated it.
2. Run the tests, then `scripts/accuracy.ts` against a local copy of the indexer database to check nothing else got worse.
3. If the loader changes, change all three copies.
4. Stored serials change only when a collection is recomputed. apps/schedules recomputes collections with a recent mint or a pending confirmation; `scripts/backfill.ts serials` recomputes everything.

## Coupon sets and claim blocks

- New coupon set: add its regex to `COUPON_SETS` in `src/kind.ts`.
- New claim block: find it with `scripts/claim-blocks.ts`, then add it to `CLAIM_BLOCKS` in `src/claim-blocks.ts`.
