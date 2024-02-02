import { Collection, Objekt } from "@/lib/server/db/indexer/schema";
import { getDaysInMonth } from "date-fns";

export type ObjektWithCollection = {
  collection: Collection;
  objekt: Objekt;
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
export function buildCalendar(objekts: ObjektWithCollection[]) {
  const calendar: Calendar = {};

  // get all possible days in a month
  const possibleDays = Array.from({ length: 31 }).map((_, i) => i + 1);
  // get the days in the current month
  const currentDays = getDays();

  // loop over all possible to catch 30th/31st drops
  for (const day of possibleDays) {
    const filteredObjekts = objekts.filter((o) => {
      const date = new Date(o.objekt.mintedAt);
      return date.getDate() === day;
    });

    for (const objekt of filteredObjekts) {
      // initialize day per for the given artist contract
      if (!calendar?.[day]?.[objekt.collection.contract]) {
        calendar[day] = {
          ...calendar[day],
          [objekt.collection.contract]: {
            count: 0,
            carried: 0,
          },
        };
      }

      // increment count
      calendar[day][objekt.collection.contract].count +=
        objekt.collection.comoAmount;

      // carry over 30th/31st drops
      if (!currentDays.includes(day)) {
        // initialize final day if it doesn't exist
        const finalDay = currentDays.at(-1)!;
        if (!calendar[finalDay]) {
          calendar[finalDay] = {
            [objekt.collection.contract]: {
              count: 0,
              carried: 0,
            },
          };
        }

        // initialize the contract specific count if it doesn't exist
        if (!calendar[finalDay][objekt.collection.contract]) {
          calendar[finalDay][objekt.collection.contract] = {
            count: 0,
            carried: 0,
          };
        }

        // increment counts
        calendar[finalDay][objekt.collection.contract].carried +=
          objekt.collection.comoAmount;
        calendar[finalDay][objekt.collection.contract].count +=
          objekt.collection.comoAmount;
      }
    }
  }

  return calendar;
}

/**
 * Get an array of days in the current month.
 */
export function getDays() {
  return Array.from({ length: getDaysInMonth(new Date()) }, (_, i) => i + 1);
}
