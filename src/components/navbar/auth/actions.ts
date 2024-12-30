"use server";

import "server-only";
import { z } from "zod";
import { redirect } from "next/navigation";
import { authenticatedAction } from "@/lib/server/typed-action";
import { getUser } from "@/app/api/common";
import { validArtists } from "@/lib/universal/cosmo/common";
import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { deleteCookie, setCookie } from "@/lib/server/cookies";
import { user } from "@/lib/server/cosmo/auth";
import { revalidatePath } from "next/cache";
import { signToken } from "@/lib/server/jwt";
import { collectionDataSources } from "@/lib/utils";

/**
 * Signs the user out
 */
export const logout = async () => {
  const auth = await getUser();
  if (auth.success === false) {
    return { success: false, error: "Invalid user" };
  }

  await deleteCookie("token");
  redirect("/objekts");
};

/**
 * Sets the selected artist for the user.
 */
export const updateSelectedArtist = async (artist: string) =>
  authenticatedAction({
    form: { artist },
    schema: z.object({
      artist: z.enum(validArtists),
    }),
    onValidate: async ({ data, user }) => {
      // const result = await setLastViewedArtist(user.accessToken, data.artist);
      // if (result === false) {
      //   throw new ActionError({
      //     status: "error",
      //     error: "Error switching artist in COSMO",
      //   });
      // }

      await db
        .update(profiles)
        .set({ artist: data.artist })
        .where(eq(profiles.id, user.profileId));

      await setCookie({ key: "artist", value: data.artist });
    },
  });

/**
 * Updates privacy settings.
 */
export const updatePrivacy = async (form: FormData) =>
  authenticatedAction({
    form,
    schema: z.object({
      privacyNickname: z.coerce.boolean(),
      privacyObjekts: z.coerce.boolean(),
      privacyTrades: z.coerce.boolean(),
      privacyComo: z.coerce.boolean(),
    }),
    onValidate: async ({ data, user }) => {
      await db
        .update(profiles)
        .set(data)
        .where(eq(profiles.id, user.profileId));
    },
  });

/**
 * Updates general settings.
 */
export const updateSettings = async (form: FormData) =>
  authenticatedAction({
    form,
    schema: z.object({
      gridColumns: z.coerce.number().min(3).max(8),
      dataSource: z.enum(collectionDataSources),
    }),
    onValidate: async ({ data, user }) => {
      await db
        .update(profiles)
        .set(data)
        .where(eq(profiles.id, user.profileId));
    },
  });

/**
 * Updates profile data and invalidates avatar cache.
 */
export const updateProfile = async () => {
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
