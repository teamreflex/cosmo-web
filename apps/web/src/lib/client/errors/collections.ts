import { m } from "@/i18n/messages";
import { isCollectionErrorCode } from "@/lib/universal/errors/collections";

/**
 * Maps a collection error code to a localized message, or null when the error
 * is not a known collection error code.
 */
export function formatCollectionError(error: unknown): string | null {
  if (!(error instanceof Error) || !isCollectionErrorCode(error.message)) {
    return null;
  }

  switch (error.message) {
    case "collection_not_found":
      return m.admin_collection_error_not_found();
    case "collection_no_objekt":
      return m.admin_collection_error_no_objekt();
    case "invalid_season_for_artist":
      return m.admin_collection_error_invalid_season();
    case "invalid_class_for_artist":
      return m.admin_collection_error_invalid_class();
    case "metadata_fetch_failed":
      return m.admin_collection_error_metadata_failed();
    default:
      error.message satisfies never;
      return null;
  }
}
