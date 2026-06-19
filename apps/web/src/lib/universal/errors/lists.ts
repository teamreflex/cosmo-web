export const listErrorCodes = [
  "not_have_list",
  "not_want_list",
  "not_sale_list",
  "not_owned",
  "not_live_list",
  "anchor_not_trade_active",
  "discord_lists_required",
  "discord_list_empty",
  "entry_not_found",
  "entry_kind_mismatch",
  "list_name_taken",
  "list_not_found",
  "list_type_locked",
  "list_no_access",
  "want_list_already_linked",
  "have_list_already_linked",
] as const;

export type ListErrorCode = (typeof listErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known list error code.
 */
export function isListErrorCode(value: string): value is ListErrorCode {
  return listErrorCodes.some((code) => code === value);
}
