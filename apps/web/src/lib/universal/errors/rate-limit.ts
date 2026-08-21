export const rateLimitErrorCodes = ["rate_limited"] as const;

export type RateLimitErrorCode = (typeof rateLimitErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known rate limit error code.
 */
export function isRateLimitErrorCode(
  value: string,
): value is RateLimitErrorCode {
  return rateLimitErrorCodes.some((code) => code === value);
}
