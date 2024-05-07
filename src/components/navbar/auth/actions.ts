"use server";

import "server-only";
import { z } from "zod";
import { cookies } from "next/headers";
import { generateCookiePayload, signToken } from "@/lib/server/jwt";
import { login } from "@/lib/server/cosmo/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authenticatedAction, typedAction } from "@/lib/server/typed-action";
import { getUser } from "@/app/api/common";
import { validArtists } from "@/lib/universal/cosmo/common";
import {
  findOrCreateProfile,
  setSelectedArtist,
  updateProfile,
} from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { profiles } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { TypedActionResult } from "@/lib/server/typed-action/types";
import { exchangeToken, sendLoginEmail } from "@/lib/server/ramper";
import { AuthenticatedActionError } from "@/lib/server/typed-action/errors";

/**
 * Requests a Ramper magic link email.
 */
export const sendRamperEmail = async (form: FormData) =>
  typedAction({
    form,
    schema: z.object({
      transactionId: z.string().uuid(),
      email: z.string().email(),
    }),
    onValidate: async ({ data }) => {
      const result = await sendLoginEmail(data);
      if (result.success === false) {
        console.error(`ramper::sendLoginEmail`, result);
        throw new AuthenticatedActionError({
          status: "error",
          error: result.error,
        });
      }

      return {
        email: data.email,
        pendingToken: result.pendingToken,
      };
    },
  });

/**
 * Exchanges the pendingToken from Ramper,
 * then the idToken from Ramper for a JWT from Cosmo
 */
export const exchangeRamperToken = async (form: FormData) =>
  typedAction({
    form,
    schema: z.object({
      transactionId: z.string().uuid(),
      email: z.string().email(),
      pendingToken: z.string(),
    }),
    onValidate: async ({ data: { transactionId, email, pendingToken } }) => {
      // exchange pendingToken with ramper
      const exchange = await exchangeToken({
        transactionId,
        pendingToken,
      });

      if (exchange.success === false) {
        console.error(`ramper::exchangeToken`, exchange);
        throw new AuthenticatedActionError({
          status: "error",
          error: exchange.error,
        });
      }

      // login with cosmo
      const loginResult = await login(email, exchange.ssoCredential.idToken);

      // find or create a profile for the user
      const payload = {
        userAddress: loginResult.address,
        nickname: loginResult.nickname,
        cosmoId: loginResult.id,
      };
      const profile = await findOrCreateProfile(payload);

      // update the pre-existing profile record
      if (profile.cosmoId === 0) {
        await updateProfile(profile.id, payload);
      }

      cookies().set(
        "token",
        await signToken({
          id: loginResult.id,
          nickname: loginResult.nickname,
          address: loginResult.address,
          profileId: profile.id,
          accessToken: loginResult.accessToken,
          refreshToken: loginResult.refreshToken,
        }),
        generateCookiePayload()
      );

      return profile;
    },
    redirectTo: ({ result }) => `/@${result.nickname}`,
  });

/**
 * Signs the user out
 */
export const logout = async () => {
  const auth = await getUser();
  if (auth.success === false) {
    return { success: false, error: "Invalid user" };
  }

  cookies().delete("token");
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
      const result = await setSelectedArtist(user.profileId, data.artist);
      revalidatePath("/");
      return result;
    },
  });

/**
 * Updates privacy settings.
 */
export const updatePrivacy = async (
  prev: TypedActionResult<void>,
  form: FormData
) =>
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

      revalidatePath(`@/${user.nickname}`);
    },
  });

/**
 * Updates general settings.
 */
export const updateSettings = async (
  prev: TypedActionResult<void>,
  form: FormData
) =>
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

      revalidatePath(`@/${user.nickname}`);
    },
  });
