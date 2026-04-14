import { DatabaseWeb } from "@/db";
import { DatabaseIndexer } from "@/db-indexer";
import { Redis } from "@/redis";
import {
  collections,
  listEventOutbox,
  objekts,
} from "@apollo/database/indexer/schema";
import {
  cosmoAccounts,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import { and, count, eq, gt, isNotNull, lt, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import type { ScheduledTask } from "../task";

const BATCH_SIZE = 1000;
const CURSOR_KEY = "list-drain:cursor";

/**
 * Drain the indexer outbox, recomputing live have-list entries whose owner
 * appears as the sender of a recent transfer. The Redis cursor advances only
 * after the web-DB transaction commits, and the recompute is idempotent so
 * re-applying the same outbox row is safe.
 */
export const drainListEventsTask = {
  name: "drain-list-events",
  cron: "*/1 * * * *",
  effect: Effect.gen(function* () {
    const indexerDb = yield* DatabaseIndexer;
    const webDb = yield* DatabaseWeb;
    const redis = yield* Redis;

    const cursorStr = yield* redis.get(CURSOR_KEY);
    const fromSeq = BigInt(cursorStr ?? "0");

    const rows = yield* Effect.tryPromise({
      try: () =>
        indexerDb
          .select({
            id: listEventOutbox.id,
            fromAddress: listEventOutbox.fromAddress,
            collectionId: listEventOutbox.collectionId,
          })
          .from(listEventOutbox)
          .where(gt(listEventOutbox.id, fromSeq))
          .orderBy(listEventOutbox.id)
          .limit(BATCH_SIZE),
      catch: (cause) => new DrainError({ cause }),
    });

    const purgeOldOutboxRows = Effect.tryPromise({
      try: () =>
        indexerDb
          .delete(listEventOutbox)
          .where(
            lt(
              listEventOutbox.createdAt,
              sql<string>`now() - interval '7 days'`,
            ),
          ),
      catch: (cause) => new DrainError({ cause }),
    });

    if (rows.length === 0) {
      yield* purgeOldOutboxRows;
      return;
    }

    // build address → user map, restricted to users with at least one
    // trade-active (linked) have list. unlinked archive lists are silently
    // ignored by the drain.
    const watchRows = yield* Effect.tryPromise({
      try: () =>
        webDb
          .selectDistinct({
            address: cosmoAccounts.address,
            userId: cosmoAccounts.userId,
          })
          .from(cosmoAccounts)
          .innerJoin(objektLists, eq(objektLists.userId, cosmoAccounts.userId))
          .where(
            and(
              eq(objektLists.type, "have"),
              isNotNull(objektLists.linkedWantListId),
              isNotNull(cosmoAccounts.userId),
            ),
          ),
      catch: (cause) => new DrainError({ cause }),
    });
    const watch = new Map<string, { address: string; userId: string }>();
    for (const row of watchRows) {
      if (row.userId === null) continue;
      watch.set(row.address, { address: row.address, userId: row.userId });
    }

    // dedupe to one recompute per (userId, collectionSlug) — the apply is
    // idempotent so duplicates wouldn't break correctness, just waste work
    const seen = new Set<string>();
    const targets: { userId: string; address: string; collectionId: string }[] =
      [];
    for (const row of rows) {
      const owner = watch.get(row.fromAddress);
      if (!owner) continue;
      const key = `${owner.userId}:${row.collectionId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({
        userId: owner.userId,
        address: owner.address,
        collectionId: row.collectionId,
      });
    }

    if (targets.length > 0) {
      yield* Effect.tryPromise({
        try: () =>
          webDb.transaction(async (tx) => {
            for (const target of targets) {
              const entry = await tx.query.objektListEntries.findFirst({
                where: {
                  collectionId: target.collectionId,
                  objektList: {
                    userId: target.userId,
                    type: "have",
                    linkedWantListId: { isNotNull: true },
                  },
                },
                columns: { id: true },
              });
              if (!entry) continue;

              // recompute the user's transferable holdings of this collection
              // against the current indexer state — naturally idempotent
              const result = await indexerDb
                .select({ owned: count() })
                .from(objekts)
                .innerJoin(
                  collections,
                  eq(collections.id, objekts.collectionId),
                )
                .where(
                  and(
                    eq(objekts.owner, target.address),
                    eq(objekts.transferable, true),
                    eq(collections.slug, target.collectionId),
                  ),
                );
              const ownedCount = result[0]?.owned ?? 0;

              if (ownedCount === 0) {
                await tx
                  .delete(objektListEntries)
                  .where(eq(objektListEntries.id, entry.id));
              } else {
                await tx
                  .update(objektListEntries)
                  .set({
                    quantity: ownedCount,
                    verifiedAt: new Date().toISOString(),
                  })
                  .where(eq(objektListEntries.id, entry.id));
              }
            }
          }),
        catch: (cause) => new DrainError({ cause }),
      });
    }

    // advance the cursor only after the web-DB tx commits. order matters:
    // a crash here causes at-least-once replay, absorbed by idempotency.
    const lastSeq = rows[rows.length - 1]!.id;
    yield* redis.set(CURSOR_KEY, lastSeq.toString());

    yield* purgeOldOutboxRows;

    yield* Effect.logInfo(
      `drain-list-events: processed ${rows.length} rows (${targets.length} recomputes)`,
    );
  }),
} satisfies ScheduledTask;

export class DrainError extends Data.TaggedError("DrainError")<{
  readonly cause: unknown;
}> {}
