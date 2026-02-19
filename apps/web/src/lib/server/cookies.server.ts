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
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  setCookie(key, stringValue, {
    ...generateCookiePayload(),
    ...(maxAge ? { maxAge } : {}),
  });
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
