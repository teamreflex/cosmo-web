import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { FRESH_SESSION_MINUTES } from "@/lib/universal/account-deletion";
import { isAccountErrorCode } from "@/lib/universal/errors/accounts";

/**
 * Maps an account error code to a localized message, or null when the code is
 * not a known account error code.
 */
export function formatAccountError(code: string): string | null {
  if (!isAccountErrorCode(code)) {
    return null;
  }

  const appName = env.VITE_APP_NAME;
  switch (code) {
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
    case "account_deletion_banned":
      return m.account_error_deletion_banned();
    case "account_deletion_email_required":
      return m.account_error_deletion_email_required();
    case "account_deletion_session_stale":
      return m.account_error_deletion_session_stale({
        minutes: FRESH_SESSION_MINUTES,
      });
    case "avatar_source_unavailable":
      return m.account_error_avatar_source_unavailable();
    default:
      code satisfies never;
      return null;
  }
}
