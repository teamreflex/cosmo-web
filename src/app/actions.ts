"use server";

import "server-only";
import { object, string } from "zod";
import { cookies } from "next/headers";
import { readToken, signToken } from "@/lib/server/jwt";
import { env } from "@/env.mjs";
import { ValidArtist, login } from "@/lib/server/cosmo";
import { redirect } from "next/navigation";
import { setSelectedArtist } from "@/lib/server/cache/artist-select";
import { revalidatePath } from "next/cache";

const cosmoLoginSchema = object({
  email: string().email(),
  token: string().min(1),
});

/**
 * Exchanges the idToken from Ramper for a JWT from Cosmo
 * @param form FormData
 */
export async function cosmoLogin(form: FormData) {
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

  cookies().set("token", await signToken(loginPayload), {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: true,
    secure: env.VERCEL_ENV !== "development",
  });

  redirect("/");
}

const updateSelectedArtistSchema = object({
  artist: string().min(1),
});

/**
 * Sets the selected artist for the user.
 * @param form FormData
 */
export async function updateSelectedArtist(form: FormData) {
  const user = await readToken(cookies().get("token")?.value);
  if (!user) {
    redirect("/");
  }

  const result = updateSelectedArtistSchema.safeParse({
    artist: form.get("artist"),
  });
  if (!result.success) {
    return { success: false, error: "Invalid artist" };
  }

  await setSelectedArtist(user.id, result.data.artist as ValidArtist);
  revalidatePath("/");
}
