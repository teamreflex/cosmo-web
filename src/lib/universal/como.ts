import { getDaysInMonth } from "date-fns";

export type ObjektWithCollection = {
  contract: string;
  mintedAt: string;
  amount: number;
};

type Calendar = {
  [day: number]: {
    [contract: string]: {
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
  const lastDayOfMonth = currentDays[currentDays.length - 1];

  for (const objekt of objekts) {
    const day = new Date(objekt.mintedAt).getDate();

    // initialize day
    if (!calendar[day]) {
      calendar[day] = {};
    }

    // initialize contract
    if (!calendar[day][objekt.contract]) {
      calendar[day][objekt.contract] = {
        count: 0,
        carried: 0,
      };
    }
    // increment count for day and contract
    calendar[day][objekt.contract].count += objekt.amount;

    // carry over drops from non-existent days to the last day of the month
    if (!currentDays.includes(day)) {
      if (!calendar[lastDayOfMonth]) {
        calendar[lastDayOfMonth] = {};
      }

      if (!calendar[lastDayOfMonth][objekt.contract]) {
        calendar[lastDayOfMonth][objekt.contract] = {
          count: 0,
          carried: 0,
        };
      }

      calendar[lastDayOfMonth][objekt.contract].carried += objekt.amount;
      calendar[lastDayOfMonth][objekt.contract].count += objekt.amount;
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
