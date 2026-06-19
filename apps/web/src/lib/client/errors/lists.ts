import { m } from "@/i18n/messages";
import { isListErrorCode } from "@/lib/universal/errors/lists";

export type Context = {
  collectionId?: string;
};

/**
 * Maps a list error code to a localized message, or null when the error is not
 * a known list error code.
 */
export function formatListError(
  error: unknown,
  context: Context = {},
): string | null {
  if (!(error instanceof Error) || !isListErrorCode(error.message)) {
    return null;
  }

  const collectionId = context.collectionId ?? "";
  switch (error.message) {
    case "not_have_list":
      return m.list_error_not_have_list();
    case "not_want_list":
      return m.list_error_not_want_list();
    case "not_sale_list":
      return m.list_error_not_sale_list();
    case "not_owned":
      return m.list_error_not_owned({ collectionId });
    case "not_live_list":
      return m.list_error_not_live_list();
    case "anchor_not_trade_active":
      return m.list_error_anchor_not_trade_active();
    case "discord_lists_required":
      return m.list_error_discord_lists_required();
    case "discord_list_empty":
      return m.list_error_discord_list_empty();
    case "entry_not_found":
      return m.list_error_entry_not_found();
    case "entry_kind_mismatch":
      return m.list_error_entry_kind_mismatch();
    case "list_name_taken":
      return m.list_error_list_name_taken();
    case "list_not_found":
      return m.list_error_list_not_found();
    case "list_type_locked":
      return m.list_error_list_type_locked();
    case "list_no_access":
      return m.list_error_list_no_access();
    case "want_list_already_linked":
      return m.list_error_want_list_already_linked();
    case "have_list_already_linked":
      return m.list_error_have_list_already_linked();
    default:
      error.message satisfies never;
      return null;
  }
}
