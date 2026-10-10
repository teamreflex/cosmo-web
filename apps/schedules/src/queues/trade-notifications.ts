import { DatabaseWeb } from "@/db";
import { insertNotifications } from "@/notifications";
import { objektListEntries, objektLists } from "@apollo/database/web/schema";
import {
  TradeNotificationsQueue,
  type TradeNotificationsJob,
} from "@apollo/queue";
import { and, eq, exists, inArray, isNotNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect, Layer } from "effect";
import { createQueueWorker } from "../queue";

/**
 * All added collections are matched in one query,
 * then one notification is inserted per (watcher, collection).
 */
const handle = Effect.fn("handleTradeNotifications")(function* (
  job: TradeNotificationsJob,
) {
  const watchers =
    job.side === "have"
      ? yield* fetchHaveAddWatchers(job)
      : yield* fetchWantAddWatchers(job);

  yield* insertNotifications(
    watchers.map(({ userId, slug }) => ({
      userId,
      type: job.side === "have" ? "trade_have" : "trade_want",
      actorId: job.sourceUserId,
      listId: job.sourceListId,
      collectionId: slug,
    })),
  );
});

/**
 * Users whose trade-active want list contains one of the added collections
 * AND whose trade-active have list holds something the source user wants.
 */
const fetchHaveAddWatchers = Effect.fn("fetchHaveAddWatchers")(function* (
  job: TradeNotificationsJob,
) {
  const db = yield* DatabaseWeb;
  const sourceWants = yield* fetchTradeActiveCollections(
    job.sourceUserId,
    "want",
  );
  if (sourceWants.length === 0) return [];

  const watcherWant = alias(objektLists, "watcher_want");
  const watcherWantLink = alias(objektLists, "watcher_want_link");
  const watcherWantEntry = alias(objektListEntries, "watcher_want_entry");
  const watcherHave = alias(objektLists, "watcher_have");
  const watcherHaveEntry = alias(objektListEntries, "watcher_have_entry");

  return yield* db
    .selectDistinct({
      userId: watcherWant.userId,
      slug: watcherWantEntry.collectionId,
    })
    .from(watcherWant)
    .innerJoin(
      watcherWantLink,
      eq(watcherWantLink.linkedWantListId, watcherWant.id),
    )
    .innerJoin(
      watcherWantEntry,
      and(
        eq(watcherWantEntry.objektListId, watcherWant.id),
        inArray(watcherWantEntry.collectionId, [...job.slugs]),
      ),
    )
    .where(
      and(
        eq(watcherWant.type, "want"),
        eq(watcherWant.discoverable, true),
        ne(watcherWant.userId, job.sourceUserId),
        exists(
          db
            .select({ id: watcherHave.id })
            .from(watcherHave)
            .innerJoin(
              watcherHaveEntry,
              eq(watcherHaveEntry.objektListId, watcherHave.id),
            )
            .where(
              and(
                eq(watcherHave.type, "have"),
                eq(watcherHave.discoverable, true),
                isNotNull(watcherHave.linkedWantListId),
                eq(watcherHave.userId, watcherWant.userId),
                inArray(watcherHaveEntry.collectionId, sourceWants),
              ),
            ),
        ),
      ),
    );
});

/**
 * Mirror of fetchHaveAddWatchers for an add to a trade-active want list:
 * users who hold the collection AND want something the source user already has.
 */
const fetchWantAddWatchers = Effect.fn("fetchWantAddWatchers")(function* (
  job: TradeNotificationsJob,
) {
  const db = yield* DatabaseWeb;
  const sourceHaves = yield* fetchTradeActiveCollections(
    job.sourceUserId,
    "have",
  );
  if (sourceHaves.length === 0) return [];

  const watcherHave = alias(objektLists, "watcher_have");
  const watcherHaveEntry = alias(objektListEntries, "watcher_have_entry");
  const watcherWant = alias(objektLists, "watcher_want");
  const watcherWantLink = alias(objektLists, "watcher_want_link");
  const watcherWantEntry = alias(objektListEntries, "watcher_want_entry");

  return yield* db
    .selectDistinct({
      userId: watcherHave.userId,
      slug: watcherHaveEntry.collectionId,
    })
    .from(watcherHave)
    .innerJoin(
      watcherHaveEntry,
      and(
        eq(watcherHaveEntry.objektListId, watcherHave.id),
        inArray(watcherHaveEntry.collectionId, [...job.slugs]),
      ),
    )
    .where(
      and(
        eq(watcherHave.type, "have"),
        eq(watcherHave.discoverable, true),
        isNotNull(watcherHave.linkedWantListId),
        ne(watcherHave.userId, job.sourceUserId),
        exists(
          db
            .select({ id: watcherWant.id })
            .from(watcherWant)
            .innerJoin(
              watcherWantLink,
              eq(watcherWantLink.linkedWantListId, watcherWant.id),
            )
            .innerJoin(
              watcherWantEntry,
              eq(watcherWantEntry.objektListId, watcherWant.id),
            )
            .where(
              and(
                eq(watcherWant.type, "want"),
                eq(watcherWant.discoverable, true),
                eq(watcherWant.userId, watcherHave.userId),
                inArray(watcherWantEntry.collectionId, sourceHaves),
              ),
            ),
        ),
      ),
    );
});

/**
 * Distinct collections across the user's trade-active lists of one side: a
 * discoverable have list paired with a want list, or a discoverable want list
 * a have list is paired with.
 */
const fetchTradeActiveCollections = Effect.fn("fetchTradeActiveCollections")(
  function* (userId: string, side: TradeNotificationsJob["side"]) {
    const db = yield* DatabaseWeb;
    const pairedHave = alias(objektLists, "paired_have");
    const rows = yield* db
      .selectDistinct({ slug: objektListEntries.collectionId })
      .from(objektLists)
      .innerJoin(
        objektListEntries,
        eq(objektListEntries.objektListId, objektLists.id),
      )
      .where(
        and(
          eq(objektLists.userId, userId),
          eq(objektLists.type, side),
          eq(objektLists.discoverable, true),
          side === "have"
            ? isNotNull(objektLists.linkedWantListId)
            : exists(
                db
                  .select({ id: pairedHave.id })
                  .from(pairedHave)
                  .where(eq(pairedHave.linkedWantListId, objektLists.id)),
              ),
        ),
      );
    return rows.map((r) => r.slug);
  },
);

/**
 * Notifies users with a mutual trade match when someone adds collections to a
 * trade-active have or want list.
 */
export const tradeNotificationsWorker = createQueueWorker(
  "trade-notifications",
  TradeNotificationsQueue.use((queue) => queue.take(handle)),
).pipe(Layer.provide(TradeNotificationsQueue.layer));
