import { DatabaseWeb } from "@/db";
import { DatabaseIndexer } from "@/db-indexer";
import { listEventOutbox } from "@apollo/database/indexer/schema";
import {
  binderEntries,
  binders,
  listDrainCursor,
  objektListEntries,
  pins,
} from "@apollo/database/web/schema";
import { pinCacheKey } from "@apollo/util-server";
import { and, gt, inArray, lt, lte, sql } from "drizzle-orm";
import { Effect } from "effect";
import { Redis } from "effect/unstable/persistence";
import type { ScheduledTask } from "../task";

const BATCH_SIZE = 1000;
const CURSOR_NAME = "outbox-drain";

/**
 * Process one drain batch. Returns the number of outbox rows pulled so the
 * caller can keep looping while we're still hitting the BATCH_SIZE ceiling.
 *
 * Idempotency: the cursor row lives in the web DB and is advanced inside
 * the same transaction that deletes the entries. A crash anywhere before
 * commit rolls back both, and after commit the cursor already points past
 * the applied rows, so the next tick never replays them.
 */
const processBatch = Effect.gen(function* () {
  const indexerDb = yield* DatabaseIndexer;
  const webDb = yield* DatabaseWeb;
  const redis = yield* Redis.Redis;

  const cursor = yield* webDb.query.listDrainCursor.findFirst({
    where: { name: CURSOR_NAME },
    columns: { seq: true },
  });
  const fromSeq = cursor?.seq ?? 0n;

  const outboxRows = yield* indexerDb
    .select({
      id: listEventOutbox.id,
      tokenId: listEventOutbox.tokenId,
      fromAddress: listEventOutbox.fromAddress,
    })
    .from(listEventOutbox)
    .where(gt(listEventOutbox.id, fromSeq))
    .orderBy(listEventOutbox.id)
    .limit(BATCH_SIZE);

  const lastRow = outboxRows.at(-1);
  if (lastRow === undefined) {
    return yield* Effect.as(purgeOutbox(fromSeq), 0);
  }

  yield* Effect.logInfo(`Draining ${outboxRows.length} outbox rows`);

  const lastSeq = lastRow.id;
  const tokenIds = [...new Set(outboxRows.map((r) => r.tokenId))];
  const numericTokenIds = tokenIds.map(Number);

  const result = yield* webDb.transaction((tx) =>
    Effect.gen(function* () {
      // every entry keyed by one of these tokenIds is stale — the chain
      // event proves the token left the sender's address. partial unique
      // index on (tokenId, objektListId) makes this an index lookup.
      yield* tx
        .delete(objektListEntries)
        .where(inArray(objektListEntries.tokenId, tokenIds));

      const deletedPins = yield* tx
        .delete(pins)
        .where(inArray(pins.tokenId, numericTokenIds))
        .returning({ address: pins.address });

      // objekts can only be placed by their owner, so a transfer out
      // empties the pocket. other entries keep their page and slot.
      const deletedBinderEntries = yield* tx
        .delete(binderEntries)
        .where(inArray(binderEntries.tokenId, numericTokenIds))
        .returning({
          binderId: binderEntries.binderId,
          page: binderEntries.page,
        });

      // cleared covers fall back to the page 1 collage
      const clearedCovers = yield* tx
        .update(binders)
        .set({ coverTokenId: null, updatedAt: new Date() })
        .where(inArray(binders.coverTokenId, numericTokenIds))
        .returning({ id: binders.id });

      if (deletedBinderEntries.length > 0) {
        yield* tx
          .update(binders)
          .set({ updatedAt: new Date() })
          .where(
            inArray(
              binders.id,
              deletedBinderEntries.map((e) => e.binderId),
            ),
          );
      }

      // pinned binders preview page 1 or their cover
      const previewChangedBinderIds = [
        ...new Set([
          ...deletedBinderEntries
            .filter((e) => e.page === 0)
            .map((e) => e.binderId),
          ...clearedCovers.map((b) => b.id),
        ]),
      ];
      const binderPins =
        previewChangedBinderIds.length > 0
          ? yield* tx.query.pins.findMany({
              where: { binderId: { in: previewChangedBinderIds } },
              columns: { address: true },
            })
          : [];

      // advance the cursor in the same transaction. any crash before
      // commit rolls back the deletes and the cursor together; after
      // commit, the next tick reads the advanced cursor and skips these
      // rows — exactly-once, no replay window.
      yield* upsertCursor(tx, lastSeq);

      const counts = {
        binderEntries: deletedBinderEntries.length,
        covers: clearedCovers.length,
      };

      const addresses = [
        ...new Set([...deletedPins, ...binderPins].map((p) => p.address)),
      ];
      if (addresses.length === 0) return { cacheKeys: [], ...counts };

      const accounts = yield* tx.query.cosmoAccounts.findMany({
        where: { address: { in: addresses } },
        columns: { address: true, username: true },
      });

      // bust both address-keyed and username-keyed cache entries since
      // either can be requested by the web app.
      return {
        cacheKeys: accounts.flatMap((a) => [
          pinCacheKey(a.address),
          pinCacheKey(a.username),
        ]),
        ...counts,
      };
    }),
  );

  if (result.cacheKeys.length > 0) {
    yield* redis.send("DEL", ...result.cacheKeys);
  }

  yield* purgeOutbox(lastSeq);

  yield* Effect.logInfo(
    `Drained ${outboxRows.length} outbox rows for ${tokenIds.length} unique tokens, deleted ${result.binderEntries} binder entries, cleared ${result.covers} binder covers, busted ${result.cacheKeys.length} pin cache keys`,
  );

  return outboxRows.length;
});

/**
 * Drain the indexer outbox, deleting live have-list entries, pins and
 * binder entries for every transferable objekt that left the sender's
 * address. Loops back-to-back while the last batch saturated the limit, so
 * backlog catches up within a single tick instead of bleeding out one
 * BATCH_SIZE at a time across cron ticks.
 */
export const drainOutboxTask = {
  name: "drain-outbox",
  cron: "*/1 * * * *",
  effect: Effect.repeat(processBatch, {
    while: (rowCount) => rowCount === BATCH_SIZE,
  }),
} satisfies ScheduledTask;

/**
 * Upsert the single-row drain cursor. Accepts either `webDb` or a `tx` so
 * the call site can choose whether to run inside a transaction.
 */
function upsertCursor(
  db: Pick<typeof DatabaseWeb.Service, "insert">,
  seq: bigint,
) {
  return db
    .insert(listDrainCursor)
    .values({ name: CURSOR_NAME, seq })
    .onConflictDoUpdate({
      target: listDrainCursor.name,
      set: { seq },
    });
}

/**
 * Delete outbox rows that are BOTH older than 7 days AND already past the
 * applied seq. Gating on the applied seq prevents events from being purged
 * before they've been applied, which would otherwise cause permanent drift
 * if the drain is down for longer than the retention window.
 */
const purgeOutbox = (appliedSeq: bigint) =>
  Effect.gen(function* () {
    const indexer = yield* DatabaseIndexer;
    return yield* indexer
      .delete(listEventOutbox)
      .where(
        and(
          lt(listEventOutbox.createdAt, sql<string>`now() - interval '7 days'`),
          lte(listEventOutbox.id, appliedSeq),
        ),
      );
  });
