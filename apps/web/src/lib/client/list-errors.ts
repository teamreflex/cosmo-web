import { m } from "@/i18n/messages";
import { isListErrorCode } from "@/lib/universal/list-errors";

type Context = {
  collectionId?: string;
};

/**
 * Maps a thrown Error from the lists server functions into a localized
 * user-facing message, falling back to the raw message for unknown errors.
 */
export function formatListError(error: unknown, context: Context = {}): string {
  if (error instanceof Error && isListErrorCode(error.message)) {
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
      case "already_on_list":
        return m.list_already_on_list({ collectionId });
      case "not_live_list":
        return m.list_error_not_live_list();
      case "anchor_not_trade_active":
        return m.list_error_anchor_not_trade_active();
      case "discord_lists_required":
        return m.list_error_discord_lists_required();
      case "discord_list_empty":
        return m.list_error_discord_list_empty();
      default:
        error.message satisfies never;
    }
  }
  return error instanceof Error ? error.message : String(error);
}
