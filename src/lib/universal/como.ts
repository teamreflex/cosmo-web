import { collections, objekts } from "@/lib/server/db/indexer/schema";
import { getDaysInMonth } from "date-fns";
import { InferSelectModel } from "drizzle-orm";

export type ObjektWithCollection = {
  collection: InferSelectModel<typeof collections>;
  objekt: InferSelectModel<typeof objekts>;
};

type Calendar = {
  [day: number]: {
    [contract: string]: number;
  };
};

/**
 * Build a breakdown per day and per contract of all Como drops.
 */
export function buildCalendar(objekts: ObjektWithCollection[]) {
  const calendar: Calendar = {};

  for (const day of getDays()) {
    const filteredObjekts = objekts.filter((o) => {
      const date = new Date(o.objekt.mintedAt);
      return date.getDate() === day;
    });

    for (const objekt of filteredObjekts) {
      if (!calendar[day]) {
        calendar[day] = {};
      }
      calendar[day][objekt.collection.contract] =
        (calendar[day][objekt.collection.contract] || 0) +
        objekt.collection.comoAmount;
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
