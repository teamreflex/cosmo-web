import { cookies } from "next/headers";
import { generateCookiePayload } from "@/lib/server/jwt";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

type CookieKey = "artist" | "token" | "user-session";

/**
 * Read the value from a cookie.
 */
export async function getCookie<T = string>(key: CookieKey) {
  const store = await cookies();
  return store.get(key)?.value as T | undefined;
}

type SetCookie = {
  key: CookieKey;
  value: string;
  cookie?: Partial<ResponseCookie>;
};

/**
 * Save a new cookie.
 */
export async function setCookie({ key, value, cookie }: SetCookie) {
  const store = await cookies();
  return store.set(key, value, {
    ...generateCookiePayload(),
    ...cookie,
  });
}

/**
 * Delete a cookie.
 */
export async function deleteCookie(key: CookieKey) {
  const store = await cookies();
  return store.delete(key);
}
