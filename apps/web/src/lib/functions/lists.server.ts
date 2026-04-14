import type { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts } from "@apollo/database/indexer/schema";
import {
  notifications,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import type { ListMatchPayload } from "@apollo/database/web/types";
import { and, eq, exists, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

type WebTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | WebTx;

/**
 * Throws if the given address doesn't currently own at least one transferable
 * objekt of the given collection slug. Used as the live-have-list add gate.
 */
export async function assertOwnsCollection(
  address: string,
  collectionSlug: string,
): Promise<void> {
  const owned = await indexer
    .select({ id: objekts.id })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        eq(objekts.owner, address),
        eq(objekts.transferable, true),
        eq(collections.slug, collectionSlug),
      ),
    )
    .limit(1);

  if (owned.length === 0) {
    throw new Error("not_owned");
  }
}

type FireNotificationArgs = {
  sourceUserId: string;
  sourceListId: string;
  collectionId: string;
};

/**
 * Insert mutual-viability notifications for users whose trade-active want list
 * contains the just-added collection AND whose trade-active have list overlaps
 * with the source user's trade-active want lists. The dedup index prevents
 * repeated notifications for the same source/target/collection combination.
 */
export async function fireHaveAddNotifications(
  tx: DbOrTx,
  args: FireNotificationArgs,
): Promise<void> {
  const watcherWant = alias(objektLists, "watcher_want");
  const watcherWantLink = alias(objektLists, "watcher_want_link");
  const watcherWantEntry = alias(objektListEntries, "watcher_want_entry");
  const watcherHave = alias(objektLists, "watcher_have");
  const watcherHaveEntry = alias(objektListEntries, "watcher_have_entry");
  const sourceWant = alias(objektLists, "source_want");
  const sourceWantLink = alias(objektLists, "source_want_link");
  const sourceWantEntry = alias(objektListEntries, "source_want_entry");

  const payload = {
    sourceUserId: args.sourceUserId,
    sourceListId: args.sourceListId,
    collectionId: args.collectionId,
    direction: "they_added_have",
  } satisfies ListMatchPayload;

  await tx
    .insert(notifications)
    .select(
      tx
        .selectDistinct({
          userId: watcherWant.userId,
          type: sql<"list_match">`'list_match'::notification_type`.as("type"),
          payload: sql<ListMatchPayload>`${JSON.stringify(payload)}::jsonb`.as(
            "payload",
          ),
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
            eq(watcherWantEntry.collectionId, args.collectionId),
          ),
        )
        .where(
          and(
            eq(watcherWant.type, "want"),
            eq(watcherWant.discoverable, true),
            ne(watcherWant.userId, args.sourceUserId),
            exists(
              tx
                .select({ id: sourceWant.id })
                .from(sourceWant)
                .innerJoin(
                  sourceWantLink,
                  eq(sourceWantLink.linkedWantListId, sourceWant.id),
                )
                .innerJoin(
                  sourceWantEntry,
                  eq(sourceWantEntry.objektListId, sourceWant.id),
                )
                .innerJoin(
                  watcherHaveEntry,
                  eq(
                    watcherHaveEntry.collectionId,
                    sourceWantEntry.collectionId,
                  ),
                )
                .innerJoin(
                  watcherHave,
                  eq(watcherHave.id, watcherHaveEntry.objektListId),
                )
                .where(
                  and(
                    eq(sourceWant.type, "want"),
                    eq(sourceWant.discoverable, true),
                    eq(sourceWant.userId, args.sourceUserId),
                    eq(watcherHave.type, "have"),
                    eq(watcherHave.discoverable, true),
                    isNotNull(watcherHave.linkedWantListId),
                    eq(watcherHave.userId, watcherWant.userId),
                  ),
                ),
            ),
          ),
        ),
    )
    .onConflictDoNothing();
}

/**
 * Mirror of fireHaveAddNotifications: fires when the source user adds to a
 * trade-active want list. Targets users who hold the collection AND want
 * something the source user already has.
 */
export async function fireWantAddNotifications(
  tx: DbOrTx,
  args: FireNotificationArgs,
): Promise<void> {
  const watcherHave = alias(objektLists, "watcher_have");
  const watcherHaveEntry = alias(objektListEntries, "watcher_have_entry");
  const watcherWant = alias(objektLists, "watcher_want");
  const watcherWantLink = alias(objektLists, "watcher_want_link");
  const watcherWantEntry = alias(objektListEntries, "watcher_want_entry");
  const sourceHave = alias(objektLists, "source_have");
  const sourceHaveEntry = alias(objektListEntries, "source_have_entry");

  const payload = {
    sourceUserId: args.sourceUserId,
    sourceListId: args.sourceListId,
    collectionId: args.collectionId,
    direction: "they_added_want",
  } satisfies ListMatchPayload;

  await tx
    .insert(notifications)
    .select(
      tx
        .selectDistinct({
          userId: watcherHave.userId,
          type: sql<"list_match">`'list_match'::notification_type`.as("type"),
          payload: sql<ListMatchPayload>`${JSON.stringify(payload)}::jsonb`.as(
            "payload",
          ),
        })
        .from(watcherHave)
        .innerJoin(
          watcherHaveEntry,
          and(
            eq(watcherHaveEntry.objektListId, watcherHave.id),
            eq(watcherHaveEntry.collectionId, args.collectionId),
          ),
        )
        .where(
          and(
            eq(watcherHave.type, "have"),
            eq(watcherHave.discoverable, true),
            isNotNull(watcherHave.linkedWantListId),
            ne(watcherHave.userId, args.sourceUserId),
            exists(
              tx
                .select({ id: sourceHave.id })
                .from(sourceHave)
                .innerJoin(
                  sourceHaveEntry,
                  eq(sourceHaveEntry.objektListId, sourceHave.id),
                )
                .innerJoin(
                  watcherWantEntry,
                  eq(
                    watcherWantEntry.collectionId,
                    sourceHaveEntry.collectionId,
                  ),
                )
                .innerJoin(
                  watcherWant,
                  eq(watcherWant.id, watcherWantEntry.objektListId),
                )
                .innerJoin(
                  watcherWantLink,
                  eq(watcherWantLink.linkedWantListId, watcherWant.id),
                )
                .where(
                  and(
                    eq(sourceHave.type, "have"),
                    eq(sourceHave.discoverable, true),
                    isNotNull(sourceHave.linkedWantListId),
                    eq(sourceHave.userId, args.sourceUserId),
                    eq(watcherWant.type, "want"),
                    eq(watcherWant.discoverable, true),
                    eq(watcherWant.userId, watcherHave.userId),
                  ),
                ),
            ),
          ),
        ),
    )
    .onConflictDoNothing();
}
