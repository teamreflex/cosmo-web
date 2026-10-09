export const accountErrorCodes = [
  "account_linked_elsewhere",
  "cosmo_already_linked",
  "cosmo_account_banned",
] as const;

export type AccountErrorCode = (typeof accountErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known account error code.
 */
export function isAccountErrorCode(value: string): value is AccountErrorCode {
  return accountErrorCodes.some((code) => code === value);
}
