import { getDaysInMonth } from "date-fns";

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
export function buildCalendar(date: Date, objekts: ObjektWithCollection[]) {
  const calendar: Calendar = {};

  // get the days in the given month
  const currentDays = getDays(date);
  const lastDayOfMonth = currentDays.at(-1)!;

  for (const objekt of objekts) {
    const day = new Date(objekt.mintedAt).getDate();

    // initialize day
    if (!calendar[day]) {
      calendar[day] = {};
    }

    // initialize contract
    if (!calendar[day][objekt.artistId]) {
      calendar[day][objekt.artistId] = {
        count: 0,
        carried: 0,
      };
    }
    // increment count for day and contract
    calendar[day][objekt.artistId]!.count += objekt.amount;

    // carry over drops from non-existent days to the last day of the month
    if (!currentDays.includes(day)) {
      if (!calendar[lastDayOfMonth]) {
        calendar[lastDayOfMonth] = {};
      }

      if (!calendar[lastDayOfMonth][objekt.artistId]) {
        calendar[lastDayOfMonth][objekt.artistId] = {
          count: 0,
          carried: 0,
        };
      }

      calendar[lastDayOfMonth][objekt.artistId]!.carried += objekt.amount;
      calendar[lastDayOfMonth][objekt.artistId]!.count += objekt.amount;
    }
  }

  // remove any days that aren't in the current month
  for (const day in calendar) {
    if (!currentDays.includes(Number(day))) {
      delete calendar[Number(day)];
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
