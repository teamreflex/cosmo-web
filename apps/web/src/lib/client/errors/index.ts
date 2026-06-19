import { formatAuthError } from "./auth";
import { formatGravityError } from "./gravity";
import { type Context, formatListError } from "./lists";
import { formatObjektError } from "./objekt";

export {
  formatAuthError,
  formatGravityError,
  formatListError,
  formatObjektError,
};

/**
 * Localizes any expected error code (list/auth/gravity/objekt) for display,
 * falling back to the raw message for genuine errors.
 */
export function formatError(error: unknown, context: Context = {}): string {
  const message =
    formatListError(error, context) ??
    formatAuthError(error) ??
    formatGravityError(error) ??
    formatObjektError(error);

  if (message !== null) {
    return message;
  }

  return error instanceof Error ? error.message : String(error);
}
