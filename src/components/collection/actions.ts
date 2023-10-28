"use server";

import "server-only";
import { z } from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import { setObjektLock } from "@/lib/server/collection/locked-objekts";

/**
 * Toggle the lock on an objekt.
 */
export const toggleObjektLock = async (form: FormData) =>
  authenticatedAction(
    z.object({
      tokenId: z.string().min(3),
      lock: z.preprocess((v) => v === "true", z.boolean()),
    }),
    form,
    async ({ tokenId, lock }, user) => {
      return await setObjektLock(user.address, parseInt(tokenId), lock);
    }
  );
