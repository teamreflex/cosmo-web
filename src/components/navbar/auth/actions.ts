"use server";

import "server-only";
import { z } from "zod";
import { cookies } from "next/headers";
import { generateCookiePayload, signToken } from "@/lib/server/jwt";
import { login } from "@/lib/server/cosmo";
import { redirect } from "next/navigation";
import { setSelectedArtist } from "@/lib/server/cache/artist-select";
import { revalidatePath } from "next/cache";
import { authenticatedAction, typedAction } from "@/lib/server/typed-action";
import { getUser } from "@/app/api/common";
import { validArtists } from "@/lib/universal/cosmo";

/**
 * Exchanges the idToken from Ramper for a JWT from Cosmo
 */
export const cosmoLogin = async (email: string, token: string) =>
  typedAction(
    z.object({
      email: z.string().email(),
      token: z.string().min(1),
    }),
    { email, token },
    async ({ email, token }) => {
      // login with cosmo
      const loginPayload = await login(email, token);

      cookies().set(
        "token",
        await signToken(loginPayload),
        generateCookiePayload()
      );

      redirect("/");
    }
  );

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
  authenticatedAction(
    z.object({
      artist: z.enum(validArtists),
    }),
    { artist },
    async ({ artist }, user) => {
      const result = await setSelectedArtist(user.id, artist);
      revalidatePath("/");
      return result;
    }
  );
