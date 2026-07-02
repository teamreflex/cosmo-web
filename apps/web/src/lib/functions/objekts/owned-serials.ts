import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { objekts } from "@/lib/server/db/indexer/schema";
import { cosmoMiddleware } from "@/lib/server/middlewares";
import { MAX_OBJEKT_SELECTIONS } from "@/lib/universal/schema/objekt-list";
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
 * Fetch every objekt of the given indexer collection UUIDs owned by the
 * authenticated user's COSMO address, grouped by collection id, plus per-token
 * transferable + locked status and derived non-transferable reason for the
 * picker UI. Collections the user owns no copies of map to an empty array.
 */
export const $fetchOwnedSerials = createServerFn({ method: "GET" })
  .validator(
    z.object({
      collectionIds: z.array(z.uuid()).min(1).max(MAX_OBJEKT_SELECTIONS),
    }),
  )
  .middleware([cosmoMiddleware])
  .handler(
    async ({ data, context }): Promise<Record<string, OwnedSerial[]>> => {
      const [owned, collections] = await Promise.all([
        indexer
          .select({
            tokenId: objekts.id,
            serial: objekts.serial,
            transferable: objekts.transferable,
            collectionId: objekts.collectionId,
          })
          .from(objekts)
          .where(
            and(
              eq(objekts.owner, context.cosmo.address.toLowerCase()),
              inArray(objekts.collectionId, data.collectionIds),
            ),
          ),
        indexer.query.collections.findMany({
          where: { id: { in: data.collectionIds } },
          columns: { id: true, class: true },
        }),
      ]);

      const result: Record<string, OwnedSerial[]> = {};
      for (const collectionId of data.collectionIds) {
        result[collectionId] = [];
      }

      if (owned.length === 0) return result;

      const classByCollection = new Map(
        collections.map((c) => [c.id, c.class]),
      );

      const tokenNumbers = owned.map((o) => Number(o.tokenId));
      const locks = await db
        .select({
          tokenId: lockedObjekts.tokenId,
          locked: lockedObjekts.locked,
        })
        .from(lockedObjekts)
        .where(
          and(
            eq(lockedObjekts.address, context.cosmo.address),
            inArray(lockedObjekts.tokenId, tokenNumbers),
            eq(lockedObjekts.locked, true),
          ),
        );

      const lockedSet = new Set(locks.map((l) => l.tokenId));

      for (const o of owned) {
        const className = classByCollection.get(o.collectionId) ?? "";
        result[o.collectionId]?.push({
          tokenId: o.tokenId,
          serial: o.serial,
          transferable: o.transferable,
          locked: lockedSet.has(Number(o.tokenId)),
          nonTransferableReason: nonTransferableReason(
            className,
            o.transferable,
          ),
        });
      }

      for (const serials of Object.values(result)) {
        serials.sort((a, b) => a.serial - b.serial);
      }

      return result;
    },
  );
