export const serialErrorCodes = [
  "objekt_not_found",
  "serial_confirmation_not_found",
] as const;

export type SerialErrorCode = (typeof serialErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known serial confirmation error code.
 */
export function isSerialErrorCode(value: string): value is SerialErrorCode {
  return serialErrorCodes.some((code) => code === value);
}
