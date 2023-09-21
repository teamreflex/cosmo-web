"use server";

import { sendEmail, exchangeToken } from "@/lib/server/ramper";
import { object, string } from "zod";
import { cookies } from "next/headers";
import { signToken } from "@/lib/server/jwt";
import { env } from "@/env.mjs";
import { login } from "@/lib/server/cosmo";
import { redirect } from "next/navigation";

const loginSchema = object({
  transactionId: string().min(1),
  email: string().email(),
});

export async function sendRamperEmail(form: FormData) {
  const result = loginSchema.safeParse({
    transactionId: form.get("transactionId"),
    email: form.get("email"),
  });

  if (!result.success) {
    return { success: false, error: "Invalid email address" };
  }

  const { transactionId, email } = result.data;
  const token = await sendEmail(transactionId, email);

  return { success: true, email, token };
}

const exchangeTokenSchema = object({
  transactionId: string().min(1),
  email: string().email(),
  token: string().min(1),
});

export async function exchangeCode(form: FormData) {
  const result = exchangeTokenSchema.safeParse({
    transactionId: form.get("transactionId"),
    email: form.get("email"),
    token: form.get("token"),
  });

  if (!result.success) {
    return { success: false, error: "Invalid email address" };
  }

  const { transactionId, email, token } = result.data;

  // exchange token with ramper
  const tokenResult = await exchangeToken(transactionId, token);
  if (!tokenResult.success) {
    return { success: false, error: tokenResult.error };
  }

  // login with cosmo
  const loginPayload = await login(email, tokenResult.token);

  cookies().set("token", await signToken(loginPayload), {
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: true,
    secure: env.VERCEL_ENV !== "development",
  });

  redirect("/");
}

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
