export const listErrorCodes = [
  "not_have_list",
  "not_want_list",
  "not_sale_list",
  "not_owned",
  "already_on_list",
  "not_live_list",
  "anchor_not_trade_active",
  "discord_lists_required",
  "discord_list_empty",
] as const;

export type ListErrorCode = (typeof listErrorCodes)[number];

export function isListErrorCode(value: string): value is ListErrorCode {
  return listErrorCodes.some((code) => code === value);
}
