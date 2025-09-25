import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/lib/server/db";
import { lockedObjekts, pins } from "@/lib/server/db/schema";
import { indexer } from "@/lib/server/db/indexer";
import { normalizePin, pinCacheKey } from "@/lib/server/objekts/pins";
import { clearTag } from "@/lib/server/cache";
import { cosmoMiddleware } from "@/lib/server/middlewares";

/**
 * Toggle the lock on an objekt.
 */
export const toggleObjektLock = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ tokenId: z.number(), lock: z.boolean() }).parse(data)
  )
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    // lock the objekt
    if (data.lock) {
      try {
        const result = await db.insert(lockedObjekts).values({
          address: context.cosmo.address,
          tokenId: data.tokenId,
          locked: true,
        });

        return result.rowCount === 1;
      } catch (error) {
        console.error(error);
        return false;
      }
    }

    // unlock
    const result = await db
      .delete(lockedObjekts)
      .where(
        and(
          eq(lockedObjekts.address, context.cosmo.address),
          eq(lockedObjekts.tokenId, data.tokenId)
        )
      );

    return result.rowCount === 1;
  });

/**
 * Pin an objekt to the user's profile.
 */
export const pinObjekt = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        tokenId: z.coerce.number(),
      })
      .parse(data)
  )
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    // perform both operations in parallel
    const [pin, objekt] = await Promise.all([
      // insert pin
      db.insert(pins).values({
        tokenId: data.tokenId,
        address: context.cosmo.address,
      }),
      // fetch objekt
      indexer.query.objekts.findFirst({
        where: {
          id: data.tokenId,
        },
        with: {
          collection: true,
        },
      }),
    ]);

    if (pin.rowCount !== 1 || objekt === undefined) {
      throw new Error("Error pinning objekt");
    }

    clearTag(pinCacheKey(context.cosmo.username));
    return normalizePin(objekt);
  });

/**
 * Delete a pin.
 */
export const unpinObjekt = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        tokenId: z.coerce.number(),
      })
      .parse(data)
  )
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    const result = await db
      .delete(pins)
      .where(
        and(
          eq(pins.tokenId, data.tokenId),
          eq(pins.address, context.cosmo.address)
        )
      );

    clearTag(pinCacheKey(context.cosmo.username));
    return result.rowCount === 1;
  });
