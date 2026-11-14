export const eventErrorCodes = ["era_slug_taken", "event_slug_taken"] as const;

export type EventErrorCode = (typeof eventErrorCodes)[number];

/**
 * Narrows an arbitrary string to a known era/event error code.
 */
export function isEventErrorCode(value: string): value is EventErrorCode {
  return eventErrorCodes.some((code) => code === value);
}
