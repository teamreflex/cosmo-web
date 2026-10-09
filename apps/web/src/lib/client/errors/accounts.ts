import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { isAccountErrorCode } from "@/lib/universal/errors/accounts";

/**
 * Maps an account error code to a localized message, or null when the error is
 * not a known account error code.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser; caught errors are genuinely unknown
export function formatAccountError(error: unknown): string | null {
  if (!(error instanceof Error) || !isAccountErrorCode(error.message)) {
    return null;
  }

  const appName = env.VITE_APP_NAME;
  switch (error.message) {
    case "account_linked_elsewhere":
      return m.account_error_linked_elsewhere({ appName });
    case "cosmo_already_linked":
      return m.account_error_already_linked();
    case "cosmo_account_banned":
      return m.account_error_cosmo_banned({ appName });
    case "account_deletion_link_invalid":
      return m.account_error_deletion_link_invalid();
    case "account_deletion_no_email":
      return m.account_error_deletion_no_email();
    case "cosmo_transfer_source_changed":
      return m.account_error_transfer_source_changed();
    case "cosmo_transfer_target_linked":
      return m.account_error_transfer_target_linked();
    case "cosmo_transfer_banned":
      return m.account_error_transfer_banned();
    case "cosmo_transfer_deleted":
      return m.account_error_transfer_deleted();
    case "cosmo_transfer_protected":
      return m.account_error_transfer_protected();
    default:
      error.message satisfies never;
      return null;
  }
}
