"use server";

import "server-only";
import { z } from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import { setObjektLock } from "@/lib/server/collection/locked-objekts";

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
