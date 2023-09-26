"use server";

import { object, string } from "zod";
import { cookies } from "next/headers";
import { signToken } from "@/lib/server/jwt";
import { env } from "@/env.mjs";
import { login } from "@/lib/server/cosmo";
import { redirect } from "next/navigation";

const cosmoLoginSchema = object({
  email: string().email(),
  token: string().min(1),
});

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
