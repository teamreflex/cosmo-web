"use server";

import "server-only";
import { z } from "zod";
import { lockObjekt, unlockObjekt } from "@/lib/server/cache";
import { authenticatedAction } from "@/lib/server/typed-action";

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
      const lockFunc = lock ? lockObjekt : unlockObjekt;
      return await lockFunc(user.address, parseInt(tokenId));
    }
  );
