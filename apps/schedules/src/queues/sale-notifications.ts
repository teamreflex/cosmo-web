import { DatabaseWeb } from "@/db";
import { insertNotifications } from "@/notifications";
import { collectionWatches } from "@apollo/database/web/schema";
import {
  SaleNotificationsQueue,
  type SaleNotificationsJob,
} from "@apollo/queue";
import { and, inArray, ne } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { createQueueWorker } from "../queue";

/**
 * One notification per watcher and listed serial.
 * The seller never notifies themselves.
 */
const handle = Effect.fn("handleSaleNotifications")(function* (
  job: SaleNotificationsJob,
) {
  const db = yield* DatabaseWeb;

  const watchers = yield* db
    .select({
      userId: collectionWatches.userId,
      slug: collectionWatches.collectionId,
    })
    .from(collectionWatches)
    .where(
      and(
        inArray(collectionWatches.collectionId, [
          ...new Set(job.entries.map((e) => e.collectionId)),
        ]),
        ne(collectionWatches.userId, job.sellerId),
      ),
    );

  yield* insertNotifications(
    watchers.flatMap(({ userId, slug }) =>
      job.entries
        .filter((entry) => entry.collectionId === slug)
        .map((entry) => ({
          userId,
          type: "sale_listed",
          actorId: job.sellerId,
          listId: job.listId,
          collectionId: slug,
          entryId: entry.id,
        })),
    ),
  );
});

/**
 * Notifies everyone watching a collection that just got a priced listing.
 */
export const saleNotificationsWorker = createQueueWorker(
  "sale-notifications",
  SaleNotificationsQueue.use((queue) => queue.take(handle)),
).pipe(Layer.provide(SaleNotificationsQueue.layer));
