import { formatAuthError } from "./auth";
import { formatCollectionError } from "./collections";
import { formatGravityError } from "./gravity";
import { type Context, formatListError } from "./lists";
import { formatObjektError } from "./objekt";

export {
  formatAuthError,
  formatCollectionError,
  formatGravityError,
  formatListError,
  formatObjektError,
};

/**
 * Localizes any expected error code (list/auth/gravity/objekt/collection),
 * falling back to the raw message for genuine errors.
 */
export function formatError(error: unknown, context: Context = {}): string {
  const message =
    formatListError(error, context) ??
    formatAuthError(error) ??
    formatGravityError(error) ??
    formatObjektError(error) ??
    formatCollectionError(error);

  if (message !== null) {
    return message;
  }

  return error instanceof Error ? error.message : String(error);
}
