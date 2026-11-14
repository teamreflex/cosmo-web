import { getCookie, setCookie } from "@tanstack/react-start/server";
import type * as z from "zod";

type CookieKey = "artists" | "market-notice" | "range-offers-notice";

/**
 * Read a cookie's JSON value, or undefined when the cookie is unset or holds
 * anything the schema refuses.
 */
export function fetchCookie<T>(key: CookieKey, schema: z.ZodType<T>) {
  const value = getCookie(key);
  if (!value) return undefined;

  try {
    return schema.parse(JSON.parse(value));
  } catch {
    return undefined;
  }
}

type SetCookie = {
  key: CookieKey;
  value: number | string[];
  maxAge?: number;
};

/**
 * Save a cookie's value as JSON.
 */
export function putCookie({ key, value, maxAge }: SetCookie) {
  setCookie(key, JSON.stringify(value), {
    path: "/",
    maxAge: maxAge ?? 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
    httpOnly: true,
    secure: true,
  });
}
