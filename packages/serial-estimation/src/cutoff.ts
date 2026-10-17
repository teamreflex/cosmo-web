/**
 * The last mint that received a real serial from COSMO's v1 metadata.
 * Objekts minted after it are stored with serial 0 and get estimated serials.
 */
export const SERIAL_CUTOFF = Date.parse("2026-06-04T08:07:05Z");
