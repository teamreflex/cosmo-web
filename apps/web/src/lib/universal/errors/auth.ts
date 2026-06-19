export const authErrorCodes = [
  "not_signed_in",
  "cosmo_not_linked",
  "not_admin",
  "EXPIRED",
  "INVALID",
  "NOT_FOUND",
] as const;

export type AuthErrorCode = (typeof authErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known auth/session error code.
 */
export function isAuthErrorCode(value: string): value is AuthErrorCode {
  return authErrorCodes.some((code) => code === value);
}
