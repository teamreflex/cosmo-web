import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { objekts } from "@/lib/server/db/indexer/schema";
import { cosmoMiddleware } from "@/lib/server/middlewares";
import type { NonTransferableReason } from "@apollo/cosmo/types/objekts";
import { lockedObjekts } from "@apollo/database/web/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import { nonTransferableReason } from "./common";

export type OwnedSerial = {
  tokenId: string;
  serial: number;
  transferable: boolean;
  locked: boolean;
  nonTransferableReason: NonTransferableReason | undefined;
};

/**
 * Fetch every objekt of the given indexer collection UUID owned by the
 * authenticated user's COSMO address, plus per-token transferable + locked
 * status and derived non-transferable reason for the picker UI.
 */
export const $fetchOwnedSerials = createServerFn({ method: "GET" })
  .inputValidator(z.object({ collectionId: z.uuid() }))
  .middleware([cosmoMiddleware])
  .handler(async ({ data, context }): Promise<OwnedSerial[]> => {
    const [owned, collection] = await Promise.all([
      indexer
        .select({
          tokenId: objekts.id,
          serial: objekts.serial,
          transferable: objekts.transferable,
        })
        .from(objekts)
        .where(
          and(
            eq(objekts.owner, context.cosmo.address),
            eq(objekts.collectionId, data.collectionId),
          ),
        ),
      indexer.query.collections.findFirst({
        where: { id: data.collectionId },
        columns: { class: true },
      }),
    ]);

    if (owned.length === 0) return [];

    const tokenNumbers = owned.map((o) => Number(o.tokenId));
    const locks = await db
      .select({ tokenId: lockedObjekts.tokenId, locked: lockedObjekts.locked })
      .from(lockedObjekts)
      .where(
        and(
          eq(lockedObjekts.address, context.cosmo.address),
          inArray(lockedObjekts.tokenId, tokenNumbers),
          eq(lockedObjekts.locked, true),
        ),
      );

    const lockedSet = new Set(locks.map((l) => l.tokenId));
    const className = collection?.class ?? "";

    return owned
      .map((o) => ({
        tokenId: o.tokenId,
        serial: o.serial,
        transferable: o.transferable,
        locked: lockedSet.has(Number(o.tokenId)),
        nonTransferableReason: nonTransferableReason(className, o.transferable),
      }))
      .sort((a, b) => a.serial - b.serial);
  });
