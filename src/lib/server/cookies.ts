import { cookies } from "next/headers";
import { generateCookiePayload } from "@/lib/server/jwt";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

type CookieKey = "artist" | "token";

/**
 * Read the value from a cookie.
 */
export function getCookie<T = string>(key: CookieKey) {
  return cookies().get(key)?.value as T | undefined;
}

type SetCookie = {
  key: CookieKey;
  value: string;
  cookie?: Partial<ResponseCookie>;
};

/**
 * Save a new cookie.
 */
export function setCookie({ key, value, cookie }: SetCookie) {
  return cookies().set(key, value, {
    ...generateCookiePayload(),
    ...cookie,
  });
}

/**
 * Delete a cookie.
 */
export function deleteCookie(key: CookieKey) {
  return cookies().delete(key);
}
