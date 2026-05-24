import { getDaysInMonth } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export type ObjektWithCollection = {
  artistId: string;
  mintedAt: string;
  amount: number;
};

type Calendar = {
  [day: number]: {
    [artistId: string]: {
      count: number;
      carried: number;
    };
  };
};

/**
 * Build a breakdown per day and per contract of all Como drops.
 */
export function buildCalendar(
  date: Date,
  objekts: ObjektWithCollection[],
  timezone: string,
) {
  const calendar: Calendar = {};

  // the displayed local month, interpreted in the viewer's timezone
  const dateInZone = toZonedTime(date, timezone);
  const displayedYear = dateInZone.getFullYear();
  const displayedMonth = dateInZone.getMonth();

  // the displayed local month can span up to two UTC months, so we check
  // the previous, current, and next UTC months for drop events whose
  // viewer-local day falls in the displayed month
  const candidates = [-1, 0, 1].map((offset) => {
    const m = displayedMonth + offset;
    if (m < 0) return { year: displayedYear - 1, month: 11 };
    if (m > 11) return { year: displayedYear + 1, month: 0 };
    return { year: displayedYear, month: m };
  });

  for (const objekt of objekts) {
    const mintUtcDay = new Date(objekt.mintedAt).getUTCDate();

    for (const { year, month } of candidates) {
      const daysInUtcMonth = getDaysInMonth(new Date(Date.UTC(year, month, 1)));
      // COSMO carries day-31 mints to the last day in shorter UTC months
      const cappedDay = Math.min(mintUtcDay, daysInUtcMonth);
      const wasCarried = mintUtcDay > daysInUtcMonth;

      const dropUtc = new Date(Date.UTC(year, month, cappedDay));
      const dropInZone = toZonedTime(dropUtc, timezone);

      // skip drops that fall outside the displayed local month
      if (
        dropInZone.getMonth() !== displayedMonth ||
        dropInZone.getFullYear() !== displayedYear
      ) {
        continue;
      }

      const day = dropInZone.getDate();

      if (!calendar[day]) {
        calendar[day] = {};
      }
      if (!calendar[day][objekt.artistId]) {
        calendar[day][objekt.artistId] = { count: 0, carried: 0 };
      }
      calendar[day][objekt.artistId]!.count += objekt.amount;
      if (wasCarried) {
        calendar[day][objekt.artistId]!.carried += objekt.amount;
      }
    }
  }

  return calendar;
}

/**
 * Get an array of days in the given month.
 */
export function getDays(date: Date) {
  return Array.from({ length: getDaysInMonth(date) }, (_, i) => i + 1);
}

export type ComoBalance = {
  id: string;
  owner: string;
  amount: number;
};
