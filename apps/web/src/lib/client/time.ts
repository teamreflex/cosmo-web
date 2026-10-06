import { getLocale } from "@/i18n/runtime";

/**
 * The `date` column is a plain `YYYY-MM-DD`; parse it as UTC so the day
 * doesn't shift in western timezones.
 */
export function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(getLocale(), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
