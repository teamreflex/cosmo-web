import { DatabaseWeb } from "@/db";
import { DatabaseIndexer } from "@/db-indexer";
import { Redis } from "@/redis";
import { listEventOutbox } from "@apollo/database/indexer/schema";
import {
  listDrainCursor,
  objektListEntries,
  pins,
} from "@apollo/database/web/schema";
import { pinCacheKey } from "@apollo/util-server";
import { and, gt, inArray, lt, lte, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
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
  const redis = yield* Redis;

  const cursor = yield* Effect.tryPromise({
    try: () =>
      webDb.query.listDrainCursor.findFirst({
        where: { name: CURSOR_NAME },
        columns: { seq: true },
      }),
    catch: (cause) => new DrainError({ cause }),
  });
  const fromSeq = cursor?.seq ?? 0n;

  const outboxRows = yield* Effect.tryPromise({
    try: () =>
      indexerDb
        .select({
          id: listEventOutbox.id,
          tokenId: listEventOutbox.tokenId,
          fromAddress: listEventOutbox.fromAddress,
        })
        .from(listEventOutbox)
        .where(gt(listEventOutbox.id, fromSeq))
        .orderBy(listEventOutbox.id)
        .limit(BATCH_SIZE),
    catch: (cause) => new DrainError({ cause }),
  });

  if (outboxRows.length === 0) {
    return yield* Effect.as(purgeOutbox(fromSeq), 0);
  }

  yield* Effect.logInfo(`Draining ${outboxRows.length} outbox rows`);

  const lastSeq = outboxRows[outboxRows.length - 1]!.id;
  const tokenIds = [...new Set(outboxRows.map((r) => r.tokenId))];

  const cacheKeys = yield* Effect.tryPromise({
    try: () =>
      webDb.transaction(async (tx) => {
        // every entry keyed by one of these tokenIds is stale — the chain
        // event proves the token left the sender's address. partial unique
        // index on (tokenId, objektListId) makes this an index lookup.
        await tx
          .delete(objektListEntries)
          .where(inArray(objektListEntries.tokenId, tokenIds));

        const deletedPins = await tx
          .delete(pins)
          .where(inArray(pins.tokenId, tokenIds.map(Number)))
          .returning({ address: pins.address });

        // advance the cursor in the same transaction. any crash before
        // commit rolls back the deletes and the cursor together; after
        // commit, the next tick reads the advanced cursor and skips these
        // rows — exactly-once, no replay window.
        await upsertCursor(tx, lastSeq);

        if (deletedPins.length === 0) return [];

        const addresses = [...new Set(deletedPins.map((p) => p.address))];
        const accounts = await tx.query.cosmoAccounts.findMany({
          where: { address: { in: addresses } },
          columns: { address: true, username: true },
        });

        // bust both address-keyed and username-keyed cache entries since
        // either can be requested by the web app.
        return accounts.flatMap((a) => [
          pinCacheKey(a.address),
          pinCacheKey(a.username),
        ]);
      }),
    catch: (cause) => new DrainError({ cause }),
  });

  if (cacheKeys.length > 0) {
    yield* redis.del(...cacheKeys);
  }

  yield* purgeOutbox(lastSeq);

  yield* Effect.logInfo(
    `Drained ${outboxRows.length} outbox rows for ${tokenIds.length} unique tokens, busted ${cacheKeys.length} pin cache keys`,
  );

  return outboxRows.length;
});

/**
 * Drain the indexer outbox, deleting live have-list entries for every
 * transferable objekt that left the sender's address. Loops back-to-back
 * while the last batch saturated the limit, so backlog catches up within
 * a single tick instead of bleeding out one BATCH_SIZE at a time across
 * cron ticks.
 */
export const drainOutboxTask = {
  name: "drain-outbox",
  cron: "*/1 * * * *",
  effect: Effect.repeat(processBatch, {
    while: (rowCount) => rowCount === BATCH_SIZE,
  }),
} satisfies ScheduledTask;

export class DrainError extends Data.TaggedError("DrainError")<{
  readonly cause: unknown;
}> {}

/**
 * Upsert the single-row drain cursor. Accepts either `webDb` or a `tx` so
 * the call site can choose whether to run inside a transaction.
 */
function upsertCursor(
  db: Pick<Effect.Effect.Success<typeof DatabaseWeb>, "insert">,
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
    return yield* Effect.tryPromise({
      try: () =>
        indexer
          .delete(listEventOutbox)
          .where(
            and(
              lt(
                listEventOutbox.createdAt,
                sql<string>`now() - interval '7 days'`,
              ),
              lte(listEventOutbox.id, appliedSeq),
            ),
          ),
      catch: (cause) => new DrainError({ cause }),
    });
  });
