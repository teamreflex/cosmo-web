export const objektErrorCodes = ["metadata_fetch_failed"] as const;

export type ObjektErrorCode = (typeof objektErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known objekt error code.
 */
export function isObjektErrorCode(value: string): value is ObjektErrorCode {
  return objektErrorCodes.some((code) => code === value);
}
