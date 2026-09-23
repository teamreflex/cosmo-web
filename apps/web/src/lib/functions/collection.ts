import { clearTag } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { cosmoMiddleware } from "@/lib/server/middlewares";
import { frontPinPosition } from "@/lib/server/pins.server";
import type { ProfilePin } from "@/lib/universal/binders";
import { lockedObjekts, pins } from "@apollo/database/web/schema";
import { pinCacheKey } from "@apollo/util-server";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
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
  .handler(async ({ data, context }): Promise<ProfilePin> => {
    // perform both operations in parallel
    const [[pin], objekt] = await Promise.all([
      // insert pin, placing it first to match the prepend behavior
      db
        .insert(pins)
        .values({
          tokenId: data.tokenId,
          address: context.cosmo.address,
          position: frontPinPosition(context.cosmo.address),
        })
        .returning({ id: pins.id }),
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

    if (pin === undefined || objekt === undefined) {
      throw new Error("Error pinning objekt");
    }

    await clearTag(
      pinCacheKey(context.cosmo.username),
      pinCacheKey(context.cosmo.address),
    );
    return { kind: "objekt", pinId: pin.id, objekt: normalizePin(objekt) };
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
 * Move one pin next to another, mirroring dnd-kit's active/over drop. The
 * client sends only the two pin ids, so objekt and binder pins reorder
 * together; the server owns the ordered list.
 */
export const $reorderPins = createServerFn({ method: "POST" })
  .validator(
    z.object({
      pinId: z.number().int(),
      overPinId: z.number().int(),
    }),
  )
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }) => {
    // the user's pins numbered 1..n by current display order
    const ordered = db.$with("ordered").as(
      db
        .select({
          id: pins.id,
          idx: sql<number>`row_number() over (order by ${pins.position}, ${pins.id})`.as(
            "idx",
          ),
        })
        .from(pins)
        .where(eq(pins.address, context.cosmo.address)),
    );

    /**
     * Where the dragged pin and its drop target currently sit; null if either isn't one of the user's pins.
     */
    const anchors = db.$with("anchors").as(
      db
        .select({
          fromIdx:
            sql<number>`max(${ordered.idx}) filter (where ${ordered.id} = ${data.pinId})`.as(
              "from_idx",
            ),
          toIdx:
            sql<number>`max(${ordered.idx}) filter (where ${ordered.id} = ${data.overPinId})`.as(
              "to_idx",
            ),
        })
        .from(ordered),
    );

    /**
     * Sort key for the new order: the dragged pin lands half a step past the
     * anchor (after it when moving down, before it when moving up, matching
     * arrayMove), everything else keeps its index. Empty when an anchor is
     * missing so the update below touches nothing.
     */
    const keyed = db.$with("keyed").as(
      db
        .select({
          id: ordered.id,
          sortKey: sql<number>`case
            when ${ordered.id} = ${data.pinId}
            then ${anchors.toIdx} + (case when ${anchors.toIdx} > ${anchors.fromIdx} then 0.5 else -0.5 end)
            else ${ordered.idx}
          end`.as("sort_key"),
        })
        .from(ordered)
        .crossJoin(anchors)
        .where(and(isNotNull(anchors.fromIdx), isNotNull(anchors.toIdx))),
    );

    /**
     * Contiguous 0-based positions, which also heals the gaps and negative
     * values that pinning (prepend) and unpinning leave behind.
     */
    const renumbered = db.$with("renumbered").as(
      db
        .select({
          id: keyed.id,
          position:
            sql<number>`(row_number() over (order by ${keyed.sortKey}) - 1)::int`.as(
              "position",
            ),
        })
        .from(keyed),
    );

    // only rows whose position actually changes are written
    const updated = await db
      .with(ordered, anchors, keyed, renumbered)
      .update(pins)
      .set({ position: sql`${renumbered.position}` })
      .from(renumbered)
      .where(
        and(eq(pins.id, renumbered.id), ne(pins.position, renumbered.position)),
      )
      .returning({ id: pins.id });

    if (updated.length === 0) return false;

    await clearTag(
      pinCacheKey(context.cosmo.username),
      pinCacheKey(context.cosmo.address),
    );
    return true;
  });
