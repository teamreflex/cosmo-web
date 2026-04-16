import type { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { objekts } from "@apollo/database/indexer/schema";
import {
  notifications,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import type { ListMatchPayload } from "@apollo/database/web/types";
import { and, eq, exists, inArray, isNotNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// it is what it is, man
type WebTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | WebTx;

/**
 * Throws unless every tokenId belongs to `address`, is transferable, and
 * matches `collectionId` (indexer UUID). Single indexer round-trip, no join —
 * `objekts.collectionId` is the FK so the filter is an index lookup.
 */
export async function assertOwnsTokens(
  address: string,
  collectionId: string,
  tokenIds: string[],
): Promise<void> {
  const owned = await indexer
    .select({ id: objekts.id })
    .from(objekts)
    .where(
      and(
        inArray(objekts.id, tokenIds),
        eq(objekts.owner, address),
        eq(objekts.transferable, true),
        eq(objekts.collectionId, collectionId),
      ),
    );

  if (owned.length !== tokenIds.length) {
    throw new Error("not_owned");
  }
}

type FireNotificationArgs = {
  sourceUserId: string;
  sourceListId: string;
  slug: string;
  collectionName: string;
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
    collectionId: args.collectionName,
    direction: "they_added_have",
  } satisfies ListMatchPayload;

  const watchers = await tx
    .selectDistinct({ userId: watcherWant.userId })
    .from(watcherWant)
    .innerJoin(
      watcherWantLink,
      eq(watcherWantLink.linkedWantListId, watcherWant.id),
    )
    .innerJoin(
      watcherWantEntry,
      and(
        eq(watcherWantEntry.objektListId, watcherWant.id),
        eq(watcherWantEntry.collectionId, args.slug),
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
              eq(watcherHaveEntry.collectionId, sourceWantEntry.collectionId),
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
    );

  if (watchers.length === 0) return;

  await tx
    .insert(notifications)
    .values(
      watchers.map(({ userId }) => ({
        userId,
        type: "list_match" as const,
        payload,
      })),
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
    collectionId: args.collectionName,
    direction: "they_added_want",
  } satisfies ListMatchPayload;

  const watchers = await tx
    .selectDistinct({ userId: watcherHave.userId })
    .from(watcherHave)
    .innerJoin(
      watcherHaveEntry,
      and(
        eq(watcherHaveEntry.objektListId, watcherHave.id),
        eq(watcherHaveEntry.collectionId, args.slug),
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
              eq(watcherWantEntry.collectionId, sourceHaveEntry.collectionId),
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
    );

  if (watchers.length === 0) return;

  await tx
    .insert(notifications)
    .values(
      watchers.map(({ userId }) => ({
        userId,
        type: "list_match" as const,
        payload,
      })),
    )
    .onConflictDoNothing();
}
