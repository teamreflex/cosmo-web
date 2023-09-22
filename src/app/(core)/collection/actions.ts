"use server";

import { preprocess, object, string, boolean } from "zod";
import { search } from "@/lib/server/cosmo";
import { lockObjekt, unlockObjekt } from "@/lib/server/cache";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";

const userSearchSchema = object({
  search: string().min(3),
});

export async function searchForUser(form: FormData) {
  const result = userSearchSchema.safeParse({
    search: form.get("search"),
  });

  if (!result.success) {
    return { success: false, error: "Must be at least 3 characters" };
  }

  const searchResults = await search(result.data.search);

  return { success: true, users: searchResults };
}

const lockObjektSchema = object({
  tokenId: string().min(3),
  lock: preprocess((v) => v === "true", boolean()),
});

export async function setObjektLock(form: FormData) {
  const result = lockObjektSchema.safeParse({
    tokenId: form.get("tokenId"),
    lock: form.get("lock"),
  });
  if (!result.success) {
    return { success: false, error: "Invalid tokenId" };
  }

  const user = await readToken(cookies().get("token")?.value);
  if (!user) {
    return { success: false, error: "Invalid user" };
  }

  const lockFunc = result.data.lock ? lockObjekt : unlockObjekt;

  return {
    success: await lockFunc(user.id, parseInt(result.data.tokenId)),
  };
}
