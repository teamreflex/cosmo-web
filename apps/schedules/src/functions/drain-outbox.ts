import { DatabaseWeb } from "@/db";
import { DatabaseIndexer } from "@/db-indexer";
import { parseOutboxRow, planBatch, type BatchPlan } from "@/outbox";
import { listEventOutbox } from "@apollo/database/indexer/schema";
import {
  binderEntries,
  binders,
  listDrainCursor,
  objektListEntries,
  pins,
} from "@apollo/database/web/schema";
import { pinCacheKey } from "@apollo/util-server";
import { and, eq, gt, inArray, lt, lte, max, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import { Redis } from "effect/unstable/persistence";
import type { ScheduledTask } from "../task";

const BATCH_SIZE = 1000;
const CURSOR_NAME = "outbox-drain";

export class MalformedOutboxRowError extends Data.TaggedError(
  "MalformedOutboxRowError",
)<{
  id: bigint;
}> {}

type WebTx = Parameters<
  Parameters<typeof DatabaseWeb.Service.transaction>[0]
>[0];

/**
 * Process one drain batch. Returns the number of outbox rows pulled so the
 * caller can keep looping while we're still hitting the BATCH_SIZE ceiling.
 *
 * Exactly-once: the cursor row is locked first, and the batch is read past
 * the locked value. The deletes and the cursor advance commit together, so
 * a crash rolls both back, and an overlapping run waits on the lock and then
 * reads past the advanced cursor.
 */
const processBatch = Effect.gen(function* () {
  const indexerDb = yield* DatabaseIndexer;
  const webDb = yield* DatabaseWeb;
  const redis = yield* Redis.Redis;

  const result = yield* webDb.transaction((tx) =>
    Effect.gen(function* () {
      const fromSeq = yield* lockCursor(tx);

      const rawRows = yield* indexerDb
        .select({
          id: listEventOutbox.id,
          type: listEventOutbox.type,
          tokenId: listEventOutbox.tokenId,
          fromAddress: listEventOutbox.fromAddress,
          toAddress: listEventOutbox.toAddress,
          transferable: listEventOutbox.transferable,
          timestamp: listEventOutbox.timestamp,
        })
        .from(listEventOutbox)
        .where(gt(listEventOutbox.id, fromSeq))
        .orderBy(listEventOutbox.id)
        .limit(BATCH_SIZE);

      const rows = yield* Effect.forEach(rawRows, (raw) => {
        const row = parseOutboxRow(raw);
        return row === undefined
          ? Effect.fail(new MalformedOutboxRowError({ id: raw.id }))
          : Effect.succeed(row);
      });

      const plan = planBatch(rows);
      if (plan === undefined) return { fromSeq, plan };

      const applied = yield* applyPlan(tx, plan);

      yield* tx
        .update(listDrainCursor)
        .set({
          seq: plan.seq,
          // greatest() skips a null, so the first drain sets it
          chainTime: sql`greatest(${listDrainCursor.chainTime}, ${plan.chainTime.toISOString()}::timestamptz)`,
        })
        .where(eq(listDrainCursor.name, CURSOR_NAME));

      return { fromSeq, rowCount: rows.length, plan, ...applied };
    }),
  );

  if (result.plan === undefined) {
    yield* warnIfCursorAhead(result.fromSeq);
    yield* purgeOutbox(result.fromSeq);
    return 0;
  }

  if (result.cacheKeys.length > 0) {
    yield* redis.send("DEL", ...result.cacheKeys);
  }

  yield* purgeOutbox(result.plan.seq);

  yield* Effect.logInfo(
    `Drained ${result.rowCount} outbox rows (${result.plan.transfers} transfers, ${result.plan.transferabilityChanges} transferability changes) up to ${result.plan.seq} at chain time ${result.plan.chainTime.toISOString()}: cleared ${result.plan.clearTokenIds.length} tokens, deleted ${result.binderEntries} binder entries, cleared ${result.covers} binder covers, busted ${result.cacheKeys.length} pin cache keys`,
  );

  return result.rowCount;
});

/**
 * Drain the indexer outbox, deleting live have-list entries, pins and
 * binder entries for every objekt that left the sender's address, and
 * recording the newest chain time drained. Loops back-to-back while the
 * last batch saturated the limit, so backlog catches up within a single tick
 * instead of bleeding out one BATCH_SIZE at a time across cron ticks.
 */
export const drainOutboxTask = {
  name: "drain-outbox",
  cron: "*/1 * * * *",
  effect: Effect.repeat(processBatch, {
    while: (rowCount) => rowCount === BATCH_SIZE,
  }),
} satisfies ScheduledTask;

/**
 * Lock the cursor row for the rest of the transaction and return its seq,
 * creating it at 0 on the first run.
 */
const lockCursor = (tx: WebTx) =>
  Effect.gen(function* () {
    yield* tx
      .insert(listDrainCursor)
      .values({ name: CURSOR_NAME, seq: 0n })
      .onConflictDoNothing();

    const [cursor] = yield* tx
      .select({ seq: listDrainCursor.seq })
      .from(listDrainCursor)
      .where(eq(listDrainCursor.name, CURSOR_NAME))
      .for("update");

    return cursor?.seq ?? 0n;
  });

/**
 * Delete the entries, pins and binder slots of every cleared token, and
 * collect the pin cache keys those deletes make stale.
 */
const applyPlan = (tx: WebTx, plan: BatchPlan) =>
  Effect.gen(function* () {
    const tokenIds = plan.clearTokenIds;
    if (tokenIds.length === 0) {
      return { cacheKeys: [], binderEntries: 0, covers: 0 };
    }
    const numericTokenIds = tokenIds.map(Number);

    // partial unique index on (tokenId, objektListId) makes this an index lookup
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
  });

/**
 * A cursor past the outbox's newest row skips every row until the outbox
 * catches up, which happens when the indexer DB is restored or replaced.
 */
const warnIfCursorAhead = (seq: bigint) =>
  Effect.gen(function* () {
    const indexer = yield* DatabaseIndexer;
    const [outbox] = yield* indexer
      .select({ maxId: max(listEventOutbox.id) })
      .from(listEventOutbox);
    const maxId = outbox?.maxId;
    if (maxId !== null && maxId !== undefined && seq > maxId) {
      yield* Effect.logWarning(
        `Drain cursor ${seq} is past the outbox's max id ${maxId}; rows up to ${seq} will be skipped`,
      );
    }
  });

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
