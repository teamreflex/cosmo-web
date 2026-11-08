import { Abstract } from "@/abstract";
import { DatabaseIndexer } from "@/db-indexer";
import {
  subsquidHotBlocks,
  subsquidStatus,
} from "@apollo/database/indexer/schema";
import { processorHeadKey } from "@apollo/util-server";
import { eq, sql } from "drizzle-orm";
import { Data, Effect } from "effect";
import { Redis } from "effect/persistence";
import type { ScheduledTask } from "../task";

/**
 * Seconds `processor-head` outlives its last write, so the web app shows the
 * status as unavailable rather than a stale head once this task stops.
 */
const HEAD_TTL_SECONDS = 5 * 60;

/**
 * Store the timestamp of the newest block the indexer has applied, for the
 * web app's system status. That is the newest hot block, falling back to the
 * finalized `status.height` while there are none. Runs every minute, so the
 * status is at most a minute behind the indexer and no page view ever pays
 * for the RPC call.
 */
export const syncProcessorHeadTask = {
  name: "sync-processor-head",
  cron: "* * * * *",
  effect: Effect.gen(function* () {
    const db = yield* DatabaseIndexer;
    const abstract = yield* Abstract;
    const redis = yield* Redis.Redis;

    const finalized = db
      .select({ height: subsquidStatus.height })
      .from(subsquidStatus)
      .where(eq(subsquidStatus.id, 0));
    const [head] = yield* db
      .select({
        height: sql<
          number | null
        >`coalesce(max(${subsquidHotBlocks.height}), (${finalized}))`,
      })
      .from(subsquidHotBlocks);

    // status.height is -1 until the processor applies its first block
    if (head?.height == null || head.height < 0) {
      return yield* new NoIndexedBlockError();
    }

    const timestamp = yield* abstract.blockTimestamp(head.height);
    yield* redis.send(
      "SET",
      processorHeadKey,
      timestamp.toISOString(),
      "EX",
      String(HEAD_TTL_SECONDS),
    );
  }),
} satisfies ScheduledTask;

/**
 * The indexer hasn't applied a block yet.
 */
export class NoIndexedBlockError extends Data.TaggedError(
  "NoIndexedBlockError",
)<{}> {}
