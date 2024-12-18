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

/**
 * Signs the user out
 */
export const logout = async () => {
  const auth = await getUser();
  if (auth.success === false) {
    return { success: false, error: "Invalid user" };
  }

  await deleteCookie("token");
  redirect("/");
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
      await db
        .update(profiles)
        .set({ artist: data.artist })
        .where(eq(profiles.id, user.profileId));

      await setCookie({ key: "artist", value: data.artist });
    },
  });

/**
 * Sets the selected artist for a guest user.
 */
export const setArtistCookie = async (artist: string) => {
  const schema = z.object({
    artist: z.enum(validArtists),
  });

  const result = schema.safeParse({ artist });
  if (result.success) {
    await setCookie({ key: "artist", value: artist });
  }

  return result.success;
};

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
    }),
    onValidate: async ({ data, user }) => {
      await db
        .update(profiles)
        .set(data)
        .where(eq(profiles.id, user.profileId));
    },
  });
