// the most objekts one listing can offer
export const MAX_OFFERED = 20;

/**
 * The most units a buy listing can ask for. At MAX_PAYMENT_AMOUNT a unit,
 * every unit together stays inside the `numeric(14,2)` amount columns.
 */
export const MAX_BUY_UNITS = 20;

// the most rows one option of a listing's trade side can have
export const MAX_WANT_ROWS = 10;

// the most options a listing can ask for, of which the claimer gives one
export const MAX_LISTING_OPTIONS = 3;

// the most objekts one want row can ask for
export const MAX_PER_ROW = 20;

// the most objekts one option of a listing can ask for across its rows
export const MAX_TOTAL_WANTED = 30;

// the longest note a listing can carry, matching its column
export const MAX_NOTE_LENGTH = 500;

// the most collections one "any of" want row can name
export const MAX_CHOICE_OPTIONS = 10;
