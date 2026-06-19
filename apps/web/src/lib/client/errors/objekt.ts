import { m } from "@/i18n/messages";
import { isObjektErrorCode } from "@/lib/universal/errors/objekt";

/**
 * Maps an objekt error code to a localized message, or null when the error is
 * not a known objekt error code.
 */
export function formatObjektError(error: unknown): string | null {
  if (!(error instanceof Error) || !isObjektErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "metadata_fetch_failed":
      return m.objekt_error_metadata_fetch_failed();
    default:
      error.message satisfies never;
      return null;
  }
}
