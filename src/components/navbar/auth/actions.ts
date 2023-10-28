"use server";

import "server-only";
import { object, string } from "zod";
import { cookies } from "next/headers";
import { generateCookiePayload, signToken } from "@/lib/server/jwt";
import { ValidArtist, login } from "@/lib/server/cosmo";
import { redirect } from "next/navigation";
import { setSelectedArtist } from "@/lib/server/cache/artist-select";
import { revalidatePath } from "next/cache";
import { getUser } from "@/app/api/common";
import { env } from "@/env.mjs";

/**
 * Exchanges the idToken from Ramper for a JWT from Cosmo
 * @param form FormData
 */
export async function cosmoLogin(form: FormData) {
  const cosmoLoginSchema = object({
    email: string().email(),
    token: string().min(1),
  });

  const result = cosmoLoginSchema.safeParse({
    email: form.get("email"),
    token: form.get("token"),
  });

  if (!result.success) {
    return { success: false, error: "Invalid login" };
  }

  const { email, token } = result.data;

  // login with cosmo
  const loginPayload = await login(email, token);

  cookies().set(
    "token",
    await signToken(loginPayload, env.JWT_SECRET),
    generateCookiePayload()
  );

  redirect("/");
}

/**
 * Sets the selected artist for the user.
 * @param form FormData
 */
export async function updateSelectedArtist(form: FormData) {
  const updateSelectedArtistSchema = object({
    artist: string().min(1),
  });

  const auth = await getUser();
  if (auth.success === false) {
    redirect("/");
  }

  const result = updateSelectedArtistSchema.safeParse({
    artist: form.get("artist"),
  });
  if (!result.success) {
    return { success: false, error: "Invalid artist" };
  }

  await setSelectedArtist(auth.user.id, result.data.artist as ValidArtist);
  revalidatePath("/");
}
