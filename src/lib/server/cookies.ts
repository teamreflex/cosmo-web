import { cookies } from "next/headers";

type CookieKey = "artist" | "token" | "user-session";

/**
 * Read the value from a cookie.
 */
export async function getCookie<T = string>(key: CookieKey) {
  const store = await cookies();
  return store.get(key)?.value as T | undefined;
}
