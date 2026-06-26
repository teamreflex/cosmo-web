import { m } from "@/i18n/messages";
import { isAuthErrorCode } from "@/lib/universal/errors/auth";

/**
 * Maps an auth/session error code to a localized message, or null when the
 * error is not a known auth error code.
 */
export function formatAuthError(error: unknown): string | null {
  if (!(error instanceof Error) || !isAuthErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "not_signed_in":
      return m.auth_error_not_signed_in();
    case "cosmo_not_linked":
      return m.auth_error_cosmo_required();
    case "not_admin":
      return m.auth_error_not_admin();
    case "EXPIRED":
      return m.link_cosmo_error_expired();
    case "INVALID":
      return m.link_cosmo_error_invalid();
    case "NOT_FOUND":
      return m.auth_error_verification_not_found();
    case "api_key_not_found":
      return m.auth_error_api_key_not_found();
    case "user_not_found":
      return m.auth_error_user_not_found();
    default:
      error.message satisfies never;
      return null;
  }
}
