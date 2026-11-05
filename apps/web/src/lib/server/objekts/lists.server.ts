import { indexer } from "@/lib/server/db/indexer";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { numberLegacyListCopies } from "@/lib/universal/lists";
import { collections, objekts } from "@apollo/database/indexer/schema";
import { objektListEntries, objektLists } from "@apollo/database/web/schema";
import {
  type TradeNotificationsJob,
  TradeNotificationsQueue,
} from "@apollo/queue";
import { captureException } from "@sentry/bun";
import { and, eq, inArray } from "drizzle-orm";
import type { alias } from "drizzle-orm/pg-core";
import { db, type DbOrTx } from "../db";
import { Runtime } from "../runtime.server";

/**
 * Copy the address's legacy lists and their entries onto the user. Runs on
 * the caller's transaction, under slugs that are free for the user, so the
 * copy can't fail on the (user, slug) unique index.
 */
export async function importObjektLists(
  executor: DbOrTx,
  userId: string,
  address: string,
) {
  const lists = await executor.query.lists.findMany({
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

  const owned = await executor.query.objektLists.findMany({
    where: { userId },
    columns: { slug: true },
  });
  const copies = numberLegacyListCopies(
    owned.map((list) => list.slug),
    lists,
  );

  const inserted = await executor
    .insert(objektLists)
    .values(copies.map(({ name, slug }) => ({ userId, name, slug })))
    .returning({ id: objektLists.id, slug: objektLists.slug });
  const idBySlug = new Map(inserted.map((list) => [list.slug, list.id]));

  const entries = copies.flatMap((copy) => {
    const objektListId = idBySlug.get(copy.slug);
    return objektListId === undefined
      ? []
      : copy.entries.map((entry) => ({
          objektListId,
          collectionId: entry.collectionId,
        }));
  });

  if (entries.length === 0) {
    return;
  }

  await executor.insert(objektListEntries).values(entries);
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
 * Throws unless every token is owned by `address` and transferable, and
 * returns the entries with their collection slug from the indexer. Entries
 * must be keyed by this slug rather than one from the client, or a user could
 * list a cheap token under a rare collection.
 */
export async function withOwnedTokenSlugs<T extends { tokenId: string }>(
  address: string,
  entries: T[],
): Promise<(T & { slug: string })[]> {
  const owned = await indexer
    .select({ id: objekts.id, slug: collections.slug })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        inArray(
          objekts.id,
          entries.map((e) => e.tokenId),
        ),
        eq(objekts.owner, address.toLowerCase()),
        eq(objekts.transferable, true),
      ),
    );

  const slugByTokenId = new Map(owned.map((o) => [o.id, o.slug]));
  return entries.map((entry) => {
    const slug = slugByTokenId.get(entry.tokenId);
    if (slug === undefined) {
      throw new ExpectedError("not_owned");
    }
    return { ...entry, slug };
  });
}

/**
 * Queue the trade-notification fan-out for a list add that has already
 * committed. A Redis failure is reported instead of thrown: the add succeeded,
 * and a client retry would repeat it, stacking want-list quantities twice.
 */
export async function queueTradeNotifications(job: TradeNotificationsJob) {
  await Runtime.runPromise(
    TradeNotificationsQueue.use((queue) => queue.offer(job)),
  ).catch(captureException);
}

// `objekt_lists` under an alias, as the trade pair reads join it to itself
type ObjektListAlias = ReturnType<typeof alias<typeof objektLists, string>>;

/**
 * `h` and `w` are a trade pair: a have list and the want list it's paired
 * with, the same user's. Both are discoverable, the pairs Trade Matches
 * shows, unless `discoverable` is false, for the caller's own pairs.
 */
export function tradePair(
  h: ObjektListAlias,
  w: ObjektListAlias,
  discoverable = true,
) {
  return and(
    eq(w.id, h.linkedWantListId),
    eq(h.type, "have"),
    eq(w.type, "want"),
    eq(w.userId, h.userId),
    discoverable ? eq(h.discoverable, true) : undefined,
    discoverable ? eq(w.discoverable, true) : undefined,
  );
}
