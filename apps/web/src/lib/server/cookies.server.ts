import { getCookie, setCookie } from "@tanstack/react-start/server";

type CookieKey = "artists";

/**
 * Read the value from a cookie.
 */
export function fetchCookie<T = string>(key: CookieKey) {
  const value = getCookie(key);
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
  maxAge?: number;
};

/**
 * Save a new cookie.
 */
export function putCookie({ key, value, maxAge }: SetCookie) {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- narrowing the SetCookie value union, not unparsed input
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  const payload = generateCookiePayload();
  if (maxAge) {
    payload.maxAge = maxAge;
  }
  setCookie(key, stringValue, payload);
}

/**
 * Generate the payload for a cookie.
 */
function generateCookiePayload() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: true,
    httpOnly: true,
    secure: true,
  };
}
