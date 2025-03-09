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
 * Updates general settings.
 */
export const updateSettings = async (form: FormData) =>
  authenticatedAction({
    form,
    schema: z.object({
      gridColumns: z.coerce.number().min(3).max(8),
      privacyVotes: z.enum(["private", "public"]),
      dataSource: z.enum(collectionDataSources),
    }),
    onValidate: async ({ data, user }) => {
      await db
        .update(profiles)
        .set({
          ...data,
          privacyVotes: data.privacyVotes === "private",
        })
        .where(eq(profiles.id, user.profileId));
    },
  });
