"use server";

import { getUser } from "@/app/api/common";
import { setCookie } from "@/lib/server/cookies";
import { user } from "@/lib/server/cosmo/auth";
import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { signToken } from "@/lib/server/jwt";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Updates profile data and invalidates avatar cache.
 */
export const refreshCosmoProfile = async () => {
  const auth = await getUser();
  if (auth.success === false) {
    return { success: false, error: "Invalid user" };
  }

  // fetch user from cosmo
  const cosmoUser = await user(auth.user.accessToken);

  // update profile
  await db
    .update(profiles)
    .set({ nickname: cosmoUser.nickname })
    .where(eq(profiles.id, auth.user.profileId));

  // update selected artist
  await setCookie({ key: "artist", value: cosmoUser.lastViewedArtist });

  // invalidate avatar cache
  revalidatePath(`/@${cosmoUser.nickname}`);

  // update token & redirect to profile if nickname changed
  if (cosmoUser.nickname !== auth.user.nickname) {
    await setCookie({
      key: "token",
      value: await signToken({
        ...auth.user,
        nickname: cosmoUser.nickname,
      }),
    });

    redirect(`/@${cosmoUser.nickname}`);
  }
};
