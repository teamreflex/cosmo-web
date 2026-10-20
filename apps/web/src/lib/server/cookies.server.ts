import { getCookie, setCookie } from "@tanstack/react-start/server";

type CookieKey = "artists" | "market-notice";

/**
 * Read the value from a cookie.
 */
export function fetchCookie<T = string>(key: CookieKey) {
  const value = getCookie(key);
  if (!value) return undefined;

  try {
    // SAFETY: putCookie writes non-string values as JSON-serialized T
    return JSON.parse(value) as T;
  } catch {
    // SAFETY: non-JSON cookies are raw strings; T defaults to string
    return value as T;
  }
}

type SetCookie = {
  key: CookieKey;
  value: string | number | string[] | object;
  maxAge?: number;
};

/**
 * Save a new cookie.
 */
export function putCookie({ key, value, maxAge }: SetCookie) {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- narrowing the SetCookie value union, not unparsed input
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  setCookie(key, stringValue, {
    path: "/",
    maxAge: maxAge ?? 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
    httpOnly: true,
    secure: true,
  });
}
