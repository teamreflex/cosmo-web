export const gravityErrorCodes = ["combination_poll_unsupported"] as const;

export type GravityErrorCode = (typeof gravityErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known gravity error code.
 */
export function isGravityErrorCode(value: string): value is GravityErrorCode {
  return gravityErrorCodes.some((code) => code === value);
}
