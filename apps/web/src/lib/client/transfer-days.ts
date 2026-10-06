import { m } from "@/i18n/messages";
import type { SpinOutcome, TransferRow } from "@/lib/universal/transfers";
import { sum } from "@/lib/utils";
import { format, subDays } from "date-fns";

export type TransferDay = {
  key: string;
  label: string;
  sub: string;
  tally: string;
  rows: TransferRow[];
};

/**
 * Split rows, newest first, into the viewer's calendar days.
 */
export function groupByDay(rows: TransferRow[], now: number): TransferDay[] {
  const today = format(now, "yyyy-MM-dd");
  const yesterday = format(subDays(now, 1), "yyyy-MM-dd");

  const days: Omit<TransferDay, "tally">[] = [];
  for (const row of rows) {
    const date = new Date(row.timestamp);
    const key = format(date, "yyyy-MM-dd");
    const last = days.at(-1);
    if (last?.key === key) {
      last.rows.push(row);
      continue;
    }

    days.push({
      key,
      label:
        key === today
          ? m.transfer_day_today()
          : key === yesterday
            ? m.transfer_day_yesterday()
            : format(date, "MMM d, yyyy"),
      sub: format(
        date,
        key === today || key === yesterday ? "EEEE, MMM d, yyyy" : "EEEE",
      ),
      rows: [row],
    });
  }

  return days.map((day) => ({ ...day, tally: tally(day.rows) }));
}

/**
 * A day's summary, such as "4 spins · 2 success · 1 fail · 1 trade".
 */
function tally(rows: TransferRow[]) {
  const spins = rows.flatMap((r) => (r.kind === "spin" ? [r] : []));
  const outcomes = (outcome: SpinOutcome) =>
    spins.filter((r) => r.outcome === outcome).length;
  const objekts = (kind: "sent" | "received") =>
    sum(rows, (r) => (r.kind === kind ? r.objekts.length : 0));
  const mints = rows.flatMap((r) => (r.kind === "mint" ? [r] : []));
  const scanned = mints.filter(
    (r) => r.objekt.collection?.onOffline === "offline",
  ).length;

  const parts: [number, (count: number) => string][] = [
    [spins.length, (count) => m.transfer_tally_spins({ count })],
    [outcomes("success"), (count) => m.transfer_tally_success({ count })],
    [outcomes("fail"), (count) => m.transfer_tally_fail({ count })],
    [outcomes("pending"), (count) => m.transfer_tally_pending({ count })],
    [
      rows.filter((r) => r.kind === "trade").length,
      (count) => m.transfer_tally_trades({ count }),
    ],
    [objekts("sent"), (count) => m.transfer_tally_sent({ count })],
    [objekts("received"), (count) => m.transfer_tally_received({ count })],
    [mints.length - scanned, (count) => m.transfer_tally_mints({ count })],
    [scanned, (count) => m.transfer_tally_scanned({ count })],
  ];
  return parts
    .filter(([count]) => count > 0)
    .map(([count, label]) => label(count))
    .join(" · ");
}
