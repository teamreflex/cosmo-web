import { indexer } from "@/lib/server/db/indexer";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { numberLegacyListCopies } from "@/lib/universal/lists";
import { objekts } from "@apollo/database/indexer/schema";
import { objektListEntries, objektLists } from "@apollo/database/web/schema";
import {
  type TradeNotificationsJob,
  TradeNotificationsQueue,
} from "@apollo/queue";
import { captureException } from "@sentry/bun";
import { and, eq, inArray } from "drizzle-orm";
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
