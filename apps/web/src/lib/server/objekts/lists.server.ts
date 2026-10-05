import { indexer } from "@/lib/server/db/indexer";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { objekts } from "@apollo/database/indexer/schema";
import {
  notifications,
  objektListEntries,
  objektLists,
} from "@apollo/database/web/schema";
import type { ListMatchPayload } from "@apollo/database/web/types";
import { captureException } from "@sentry/bun";
import { and, eq, exists, inArray, isNotNull, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";

type WebTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTx = typeof db | WebTx;

/**
 * Import objekt lists from the old tables into the new ones.
 */
export async function importObjektLists(userId: string, address: string) {
  const lists = await db.query.lists.findMany({
    where: {
      userAddress: address,
    },
    with: {
      entries: true,
    },
  });

  if (lists.length === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    // insert the lists
    const result = await tx
      .insert(objektLists)
      .values(
        // ensure there's no slug or name collision
        lists.map((list) => {
          const name =
            list.name.length > 22 ? list.name.slice(0, 22) : list.name;
          const slug =
            list.slug.length > 22 ? list.slug.slice(0, 22) : list.slug;

          return {
            userId,
            name: `${name} 2`,
            slug: `${slug}-2`,
          };
        }),
      )
      .returning();

    // build entries
    const entries = [];
    for (const list of lists) {
      const objektList = result.find((r) => r.slug === list.slug);
      if (!objektList) {
        continue;
      }

      for (const entry of list.entries) {
        entries.push({
          objektListId: objektList.id,
          collectionId: entry.collectionId,
        });
      }
    }

    if (entries.length === 0) {
      return;
    }

    // insert entries
    await tx.insert(objektListEntries).values(entries);
  });
}

/**
 * Throws unless the given user owns the given list. Accepts either the bare
 * connection or a transaction so callers inside a tx run the check on the
 * same snapshot as their writes.
 */
export async function assertUserOwnsList(
  id: string,
  userId: string,
  conn: DbOrTx = db,
) {
  const count = await conn.$count(
    objektLists,
    and(eq(objektLists.id, id), eq(objektLists.userId, userId)),
  );

  if (count === 0) {
    throw new ExpectedError("list_no_access");
  }
}

/**
 * Throws unless every (tokenId, collectionId) pair is owned by `address` and
 * transferable. Tokens may span collections, so a single indexer round-trip
 * fetches the owned set and each pair is checked against the id->collectionId
 * map it builds.
 */
export async function assertOwnsTokensMulti(
  address: string,
  tokens: { tokenId: string; collectionId: string }[],
): Promise<void> {
  const owned = await indexer
    .select({ id: objekts.id, collectionId: objekts.collectionId })
    .from(objekts)
    .where(
      and(
        inArray(
          objekts.id,
          tokens.map((t) => t.tokenId),
        ),
        eq(objekts.owner, address.toLowerCase()),
        eq(objekts.transferable, true),
      ),
    );

  const collectionByTokenId = new Map(owned.map((o) => [o.id, o.collectionId]));
  for (const token of tokens) {
    if (collectionByTokenId.get(token.tokenId) !== token.collectionId) {
      throw new ExpectedError("not_owned");
    }
  }
}

type FireListAddNotificationArgs = {
  sourceUserId: string;
  sourceListId: string;
  collections: { slug: string; collectionName: string }[];
};

/**
 * Notify users whose trade-active want list contains one of the just-added
 * collections AND whose trade-active have list holds something the source
 * user wants.
 */
export async function fireHaveAddNotifications(
  args: FireListAddNotificationArgs,
) {
  if (args.collections.length === 0) return;
  await insertHaveAddNotifications(args).catch(captureException);
}

/**
 * Mirror of fireHaveAddNotifications for an add to a trade-active want list:
 * notifies users who hold the collection AND want something the source user
 * already has.
 */
export async function fireWantAddNotifications(
  args: FireListAddNotificationArgs,
) {
  if (args.collections.length === 0) return;
  await insertWantAddNotifications(args).catch(captureException);
}

/**
 * All added collections are matched in one query, then one notification is
 * inserted per (watcher, collection); the dedup index prevents repeats for the
 * same source/target/collection.
 */
async function insertHaveAddNotifications(args: FireListAddNotificationArgs) {
  const sourceWants = await fetchTradeActiveCollections(
    args.sourceUserId,
    "want",
  );
  if (sourceWants.length === 0) return;

  const watcherWant = alias(objektLists, "watcher_want");
  const watcherWantLink = alias(objektLists, "watcher_want_link");
  const watcherWantEntry = alias(objektListEntries, "watcher_want_entry");
  const watcherHave = alias(objektLists, "watcher_have");
  const watcherHaveEntry = alias(objektListEntries, "watcher_have_entry");

  const watchers = await db
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
        inArray(
          watcherWantEntry.collectionId,
          args.collections.map((c) => c.slug),
        ),
      ),
    )
    .where(
      and(
        eq(watcherWant.type, "want"),
        eq(watcherWant.discoverable, true),
        ne(watcherWant.userId, args.sourceUserId),
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

  await insertListMatches(args, watchers, "they_added_have");
}

async function insertWantAddNotifications(args: FireListAddNotificationArgs) {
  const sourceHaves = await fetchTradeActiveCollections(
    args.sourceUserId,
    "have",
  );
  if (sourceHaves.length === 0) return;

  const watcherHave = alias(objektLists, "watcher_have");
  const watcherHaveEntry = alias(objektListEntries, "watcher_have_entry");
  const watcherWant = alias(objektLists, "watcher_want");
  const watcherWantLink = alias(objektLists, "watcher_want_link");
  const watcherWantEntry = alias(objektListEntries, "watcher_want_entry");

  const watchers = await db
    .selectDistinct({
      userId: watcherHave.userId,
      slug: watcherHaveEntry.collectionId,
    })
    .from(watcherHave)
    .innerJoin(
      watcherHaveEntry,
      and(
        eq(watcherHaveEntry.objektListId, watcherHave.id),
        inArray(
          watcherHaveEntry.collectionId,
          args.collections.map((c) => c.slug),
        ),
      ),
    )
    .where(
      and(
        eq(watcherHave.type, "have"),
        eq(watcherHave.discoverable, true),
        isNotNull(watcherHave.linkedWantListId),
        ne(watcherHave.userId, args.sourceUserId),
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

  await insertListMatches(args, watchers, "they_added_want");
}

/**
 * Distinct collections across the user's trade-active lists of one side: a
 * discoverable have list paired with a want list, or a discoverable want list a have list is paired with.
 */
async function fetchTradeActiveCollections(
  userId: string,
  side: "have" | "want",
) {
  const pairedHave = alias(objektLists, "paired_have");
  const rows = await db
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
}

async function insertListMatches(
  args: FireListAddNotificationArgs,
  watchers: { userId: string; slug: string }[],
  direction: ListMatchPayload["direction"],
) {
  const collectionNameBySlug = new Map(
    args.collections.map((c) => [c.slug, c.collectionName]),
  );
  const values = watchers.flatMap(({ userId, slug }) => {
    const collectionName = collectionNameBySlug.get(slug);
    if (collectionName === undefined) return [];
    return [
      {
        userId,
        type: "list_match" as const,
        payload: {
          sourceUserId: args.sourceUserId,
          sourceListId: args.sourceListId,
          collectionId: collectionName,
          direction,
        } satisfies ListMatchPayload,
      },
    ];
  });
  if (values.length === 0) return;

  await db.insert(notifications).values(values).onConflictDoNothing();
}
