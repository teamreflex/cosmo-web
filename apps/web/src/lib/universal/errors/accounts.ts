export const accountErrorCodes = [
  "account_linked_elsewhere",
  "cosmo_already_linked",
  "cosmo_account_banned",
  "account_deletion_link_invalid",
  "account_deletion_no_email",
  "account_deletion_banned",
  "account_deletion_email_required",
  "account_deletion_session_stale",
  "cosmo_transfer_source_changed",
  "cosmo_transfer_target_linked",
  "cosmo_transfer_banned",
  "cosmo_transfer_protected",
] as const;

export type AccountErrorCode = (typeof accountErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known account error code.
 */
export function isAccountErrorCode(value: string): value is AccountErrorCode {
  return accountErrorCodes.some((code) => code === value);
}
