"use server";

import "server-only";
import { z } from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import { setObjektLock } from "@/lib/server/collection/locked-objekts";
import { db } from "@/lib/server/db";
import { pins } from "@/lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { indexer } from "@/lib/server/db/indexer";
import { normalizePin } from "@/lib/server/objekts/pins";
import { ActionError } from "@/lib/server/typed-action/errors";

/**
 * Toggle the lock on an objekt.
 */
export const toggleObjektLock = async (form: {
  tokenId: number;
  lock: boolean;
}) =>
  authenticatedAction({
    form,
    schema: z.object({
      tokenId: z.number(),
      lock: z.boolean(),
    }),
    onValidate: async ({ data: { tokenId, lock }, user }) => {
      return await setObjektLock(user.address, tokenId, lock);
    },
  });

/**
 * Pin an objekt to the user's profile.
 */
export async function pinObjekt(tokenId: number) {
  return authenticatedAction({
    form: { tokenId },
    schema: z.object({
      tokenId: z.coerce.number(),
    }),
    onValidate: async ({ data, user }) => {
      const result = await db.insert(pins).values({
        ...data,
        address: user.address,
      });

      if (result.rowCount !== 1) {
        throw new ActionError({
          status: "error",
          error: "Error pinning objekt",
        });
      }

      const objekt = await indexer.query.objekts.findFirst({
        where: {
          id: data.tokenId,
        },
        with: {
          collection: true,
        },
      });

      if (objekt === undefined) {
        throw new ActionError({
          status: "error",
          error: "Objekt does not exist",
        });
      }

      return normalizePin(objekt);
    },
  });
}

/**
 * Delete a pin.
 */
export async function unpinObjekt(tokenId: number) {
  return authenticatedAction({
    form: { tokenId },
    schema: z.object({
      tokenId: z.coerce.number(),
    }),
    onValidate: async ({ data, user }) => {
      const result = await db
        .delete(pins)
        .where(
          and(eq(pins.tokenId, data.tokenId), eq(pins.address, user.address))
        );

      return result.rowCount === 1;
    },
  });
}
