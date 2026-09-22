import { clearTag } from "@/lib/server/cache.server";
import type { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import type { BinderPreviewImage } from "@/lib/universal/binders";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { binders } from "@apollo/database/web/schema";
import { pinCacheKey } from "@apollo/util-server";
import { and, eq } from "drizzle-orm";

type WebTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Lock a binder row for the rest of the transaction, so concurrent writes
 * can't change its layout or page count mid-way. Throws unless the binder
 * belongs to the user.
 */
export async function lockOwnedBinder(
  tx: WebTx,
  binderId: string,
  userId: string,
) {
  const [binder] = await tx
    .select({
      id: binders.id,
      layout: binders.layout,
      pageCount: binders.pageCount,
      coverTokenId: binders.coverTokenId,
    })
    .from(binders)
    .where(and(eq(binders.id, binderId), eq(binders.userId, userId)))
    .for("update");

  if (!binder) {
    throw new ExpectedError("binder_not_found");
  }

  return binder;
}

/**
 * Resolve cover and collage images for binder previews by token id, in one
 * indexer lookup.
 */
export async function fetchBinderPreviewImages(
  tokenIds: number[],
): Promise<Map<number, BinderPreviewImage>> {
  if (tokenIds.length === 0) return new Map();

  const rows = await indexer.query.objekts.findMany({
    where: { id: { in: [...new Set(tokenIds)].map(String) } },
    columns: { id: true },
    with: {
      collection: {
        columns: {
          slug: true,
          collectionId: true,
          frontImage: true,
          frontImageVersion: true,
        },
      },
    },
  });

  return new Map(
    rows.map((row) => {
      const tokenId = Number(row.id);
      return [tokenId, { tokenId, ...row.collection }];
    }),
  );
}

/**
 * Clear the owner's cached pins, which draw pinned binders as their cover.
 * Both keys are cleared since the profile can be opened by either.
 */
export async function clearBinderPinCache(cosmo: {
  username: string;
  address: string;
}) {
  await clearTag(pinCacheKey(cosmo.username), pinCacheKey(cosmo.address));
}
