import { objekts, transfers } from "@/lib/server/db/indexer/schema";
import { getDaysInMonth } from "date-fns";
import { InferSelectModel } from "drizzle-orm";

export type Transfer = InferSelectModel<typeof transfers>;
export type Objekt = InferSelectModel<typeof objekts>;
export type TransferObjekt = {
  transfer: Transfer;
  objekt: Objekt;
};

type Calendar = {
  [day: number]: {
    [contract: string]: number;
  };
};

/**
 * Build a breakdown per day and per contract of all Como drops.
 */
export function buildCalendar(transfers: TransferObjekt[]) {
  const calendar: Calendar = {};

  for (const day of getDays()) {
    const filteredTransfers = transfers.filter((t) => {
      const date = new Date(t.transfer.timestamp + "Z");
      return date.getDate() === day;
    });

    for (const transfer of filteredTransfers) {
      if (!calendar[day]) {
        calendar[day] = {};
      }
      calendar[day][transfer.objekt.contract] =
        (calendar[day][transfer.objekt.contract] || 0) +
        transfer.objekt.comoAmount;
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
