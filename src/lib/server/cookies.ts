import { cookies } from "next/headers";
import { generateCookiePayload } from "./jwt";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

type CookieKey = "artists" | "token" | "user-session";

/**
 * Read the value from a cookie.
 */
export async function getCookie<T = string>(key: CookieKey) {
  const store = await cookies();
  const value = store.get(key)?.value;

  if (!value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

type SetCookie = {
  key: CookieKey;
  value: string | string[] | object;
  cookie?: Partial<ResponseCookie>;
};

/**
 * Save a new cookie.
 */
export async function setCookie({ key, value, cookie }: SetCookie) {
  const store = await cookies();
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);

  return store.set(key, stringValue, {
    ...generateCookiePayload(),
    ...cookie,
  });
}
