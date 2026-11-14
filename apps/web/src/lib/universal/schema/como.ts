import * as z from "zod";

/**
 * The moment a COMO calendar is built for: the request's `now` param, a unix
 * timestamp in seconds or milliseconds, or the current time without one.
 * Seconds may carry a fraction, as `time.time()` prints them.
 */
export const calendarDateSchema = z.coerce
  .number()
  .positive()
  .optional()
  .transform((timestamp) =>
    timestamp === undefined
      ? new Date()
      : new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp),
  );
