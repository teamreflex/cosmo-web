import { clearTag } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { cosmoMiddleware } from "@/lib/server/middlewares";
import { lockedObjekts, pins } from "@apollo/database/web/schema";
import { pinCacheKey } from "@apollo/util-server";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as z from "zod";
import { normalizePin } from "./pins";

/**
 * Toggle the lock on an objekt.
 */
export const $toggleObjektLock = createServerFn({ method: "POST" })
  .validator(z.object({ tokenId: z.number(), lock: z.boolean() }))
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
  .validator(
    z.object({
      tokenId: z.coerce.number(),
    }),
  )
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    // perform both operations in parallel
    const [, objekt] = await Promise.all([
      // insert pin, placing it first to match the prepend behavior
      db.insert(pins).values({
        tokenId: data.tokenId,
        address: context.cosmo.address,
        position: sql`COALESCE((SELECT MIN(${pins.position}) FROM ${pins} WHERE ${pins.address} = ${context.cosmo.address}), 0) - 1`,
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

    await clearTag(
      pinCacheKey(context.cosmo.username),
      pinCacheKey(context.cosmo.address),
    );
    return normalizePin(objekt);
  });

/**
 * Delete a pin.
 */
export const $unpinObjekt = createServerFn({ method: "POST" })
  .validator(
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

    await clearTag(
      pinCacheKey(context.cosmo.username),
      pinCacheKey(context.cosmo.address),
    );
    return true;
  });

/**
 * Reorder the user's pins to match the given token id order.
 */
export const $reorderPins = createServerFn({ method: "POST" })
  .validator(z.object({ tokenIds: z.array(z.coerce.number()).min(1) }))
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    // single atomic UPDATE assigning each token its index as the new position;
    // address scoping + inArray make foreign token ids no-ops (they match no rows)
    const cases = sql.join(
      [
        sql`CASE`,
        ...data.tokenIds.map(
          (id, i) => sql`WHEN ${pins.tokenId} = ${id} THEN ${i}`,
        ),
        sql`ELSE ${pins.position} END`,
      ],
      sql` `,
    );

    await db
      .update(pins)
      .set({ position: cases })
      .where(
        and(
          eq(pins.address, context.cosmo.address),
          inArray(pins.tokenId, data.tokenIds),
        ),
      );

    await clearTag(
      pinCacheKey(context.cosmo.username),
      pinCacheKey(context.cosmo.address),
    );
    return true;
  });
