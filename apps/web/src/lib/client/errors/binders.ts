import { m } from "@/i18n/messages";
import { MAX_BINDER_PAGES } from "@/lib/universal/binders";
import { isBinderErrorCode } from "@/lib/universal/errors/binders";

/**
 * Maps a binder error code to a localized message, or null when the code is
 * not a known binder error code.
 */
export function formatBinderError(code: string): string | null {
  if (!isBinderErrorCode(code)) {
    return null;
  }

  switch (code) {
    case "binder_not_found":
      return m.binder_error_binder_not_found();
    case "binder_name_taken":
      return m.binder_error_binder_name_taken();
    case "binder_limit_reached":
      return m.binder_error_binder_limit_reached();
    case "binder_page_limit_reached":
      return m.binder_error_binder_page_limit_reached({
        max: MAX_BINDER_PAGES,
      });
    case "binder_layout_locked":
      return m.binder_error_binder_layout_locked();
    case "cover_not_in_binder":
      return m.binder_error_cover_not_in_binder();
    case "pocket_out_of_range":
      return m.binder_error_pocket_out_of_range();
    case "page_out_of_range":
      return m.binder_error_page_out_of_range();
    case "objekt_not_owned":
      return m.binder_error_objekt_not_owned();
    default:
      code satisfies never;
      return null;
  }
}
