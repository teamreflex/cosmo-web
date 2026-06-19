/**
 * Patterns for ignoring noise within Sentry.
 */
export const sentryIgnoreErrors: (string | RegExp)[] = [
  // in-app browser / WebView native bridges (Instagram, Twitter, Kakao, ...)
  /messageHandlers/,
  "Java object is gone",
  /Error invoking (post|enableDidUser|send)/,

  // browser extensions / injected scripts
  "Can't find variable: CONFIG",
  /runtime\.sendMessage/,

  // navigation aborts — the user left or the connection dropped
  /AbortError/,

  // stale-deploy transients: an old client requesting chunks or server-fn
  // hashes a newer deploy renamed. Resolves on reload.
  "Importing a module script failed",
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Server function info not found",
];

export const sentryDenyUrls: (string | RegExp)[] = [
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-(web-)?extension:/,
];

/**
 * Generic fetch failures (offline, flaky network) are mostly noise,
 * but also how a real backend/CDN outage looks client-side.
 * so we downsample rather than drop them, keeping enough volume for a spike to surface.
 */
export const transientFetchError = /Load failed|Failed to fetch/;
export const transientFetchSampleRate = 0.1;
