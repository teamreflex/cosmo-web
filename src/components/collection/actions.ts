"use server";

import "server-only";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { lockedObjekts, pins } from "@/lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { indexer } from "@/lib/server/db/indexer";
import { normalizePin } from "@/lib/server/objekts/pins";
import { ActionError, cosmoActionClient } from "@/lib/server/server-actions";
import { clearTag } from "@/lib/server/cache";

/**
 * Toggle the lock on an objekt.
 */
export const toggleObjektLock = cosmoActionClient
  .metadata({ actionName: "toggleObjektLock" })
  .inputSchema(z.object({ tokenId: z.number(), lock: z.boolean() }))
  .action(async ({ parsedInput: { tokenId, lock }, ctx }) => {
    // lock the objekt
    if (lock) {
      try {
        const result = await db.insert(lockedObjekts).values({
          address: ctx.cosmo.address,
          tokenId,
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
          eq(lockedObjekts.address, ctx.cosmo.address),
          eq(lockedObjekts.tokenId, tokenId)
        )
      );

    return result.rowCount === 1;
  });

/**
 * Pin an objekt to the user's profile.
 */
export const pinObjekt = cosmoActionClient
  .metadata({ actionName: "pinObjekt" })
  .inputSchema(
    z.object({
      tokenId: z.coerce.number(),
    })
  )
  .action(async ({ parsedInput: { tokenId }, ctx }) => {
    // perform both operations in parallel
    const [pin, objekt] = await Promise.all([
      // insert pin
      db.insert(pins).values({
        tokenId,
        address: ctx.cosmo.address,
      }),
      // fetch objekt
      indexer.query.objekts.findFirst({
        where: {
          id: tokenId,
        },
        with: {
          collection: true,
        },
      }),
    ]);

    if (pin.rowCount !== 1 || objekt === undefined) {
      throw new ActionError("Error pinning objekt");
    }

    clearTag(`pins:${ctx.cosmo.username.toLowerCase()}`);
    return normalizePin(objekt);
  });

/**
 * Delete a pin.
 */
export const unpinObjekt = cosmoActionClient
  .metadata({ actionName: "unpinObjekt" })
  .inputSchema(
    z.object({
      tokenId: z.coerce.number(),
    })
  )
  .action(async ({ parsedInput: { tokenId }, ctx }) => {
    const result = await db
      .delete(pins)
      .where(
        and(eq(pins.tokenId, tokenId), eq(pins.address, ctx.cosmo.address))
      );

    clearTag(`pins:${ctx.cosmo.username.toLowerCase()}`);
    return result.rowCount === 1;
  });
