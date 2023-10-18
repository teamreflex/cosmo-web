"use server";

import "server-only";
import { preprocess, object, string, boolean } from "zod";
import { search } from "@/lib/server/cosmo";
import { lockObjekt, unlockObjekt } from "@/lib/server/cache";
import { getUser } from "@/app/api/common";

/**
 * Search Cosmo for a user.
 * @param form FormData
 */
export async function searchForUser(form: FormData) {
  const auth = await getUser();
  if (auth.success === false) {
    return { success: false, error: "Invalid user" };
  }

  const userSearchSchema = object({
    search: string().min(3),
  });
  const result = userSearchSchema.safeParse({
    search: form.get("search"),
  });

  if (!result.success) {
    return { success: false, error: "Must be at least 3 characters" };
  }

  const searchResults = await search(result.data.search);

  return { success: true, users: searchResults };
}

/**
 * Toggle the lock on an objekt.
 * @param form FormData
 */
export async function setObjektLock(form: FormData) {
  const auth = await getUser();
  if (auth.success === false) {
    return { success: false, error: "Invalid user" };
  }

  const lockObjektSchema = object({
    tokenId: string().min(3),
    lock: preprocess((v) => v === "true", boolean()),
  });

  const result = lockObjektSchema.safeParse({
    tokenId: form.get("tokenId"),
    lock: form.get("lock"),
  });
  if (!result.success) {
    return { success: false, error: "Invalid tokenId" };
  }

  const lockFunc = result.data.lock ? lockObjekt : unlockObjekt;

  return {
    success: await lockFunc(auth.user.id, parseInt(result.data.tokenId)),
  };
}
