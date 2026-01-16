import { clearTag } from "@/lib/server/cache";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { cosmoMiddleware } from "@/lib/server/middlewares";
import { normalizePin, pinCacheKey } from "@/lib/server/objekts/pins";
import { lockedObjekts, pins } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

/**
 * Toggle the lock on an objekt.
 */
export const $toggleObjektLock = createServerFn({ method: "POST" })
  .inputValidator(z.object({ tokenId: z.number(), lock: z.boolean() }))
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    // lock the objekt
    if (data.lock) {
      try {
        await db
          .insert(lockedObjekts)
          .values({
            address: context.cosmo.address,
            tokenId: data.tokenId,
            locked: true,
          })
          .returning();

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }

    // unlock
    await db
      .delete(lockedObjekts)
      .where(
        and(
          eq(lockedObjekts.address, context.cosmo.address),
          eq(lockedObjekts.tokenId, data.tokenId),
        ),
      );

    return true;
  });

/**
 * Pin an objekt to the user's profile.
 */
export const $pinObjekt = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      tokenId: z.coerce.number(),
    }),
  )
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    // perform both operations in parallel
    const [, objekt] = await Promise.all([
      // insert pin
      db.insert(pins).values({
        tokenId: data.tokenId,
        address: context.cosmo.address,
      }),
      // fetch objekt
      indexer.query.objekts.findFirst({
        where: {
          id: data.tokenId.toString(),
        },
        with: {
          collection: true,
        },
      }),
    ]);

    if (objekt === undefined) {
      throw new Error("Error pinning objekt");
    }

    await Promise.all([
      clearTag(pinCacheKey(context.cosmo.username)),
      clearTag(pinCacheKey(context.cosmo.address)),
    ]);
    return normalizePin(objekt);
  });

/**
 * Delete a pin.
 */
export const $unpinObjekt = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      tokenId: z.coerce.number(),
    }),
  )
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    await db
      .delete(pins)
      .where(
        and(
          eq(pins.tokenId, data.tokenId),
          eq(pins.address, context.cosmo.address),
        ),
      );

    await Promise.all([
      clearTag(pinCacheKey(context.cosmo.username)),
      clearTag(pinCacheKey(context.cosmo.address)),
    ]);
    return true;
  });
