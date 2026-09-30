export const binderErrorCodes = [
  "binder_not_found",
  "binder_name_taken",
  "binder_limit_reached",
  "binder_page_limit_reached",
  "binder_layout_locked",
  "cover_not_in_binder",
  "pocket_out_of_range",
  "objekt_not_owned",
] as const;

export type BinderErrorCode = (typeof binderErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known binder error code.
 */
export function isBinderErrorCode(value: string): value is BinderErrorCode {
  return binderErrorCodes.some((code) => code === value);
}
