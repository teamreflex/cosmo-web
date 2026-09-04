import { getLocale } from "@/i18n/runtime";

/**
 * Human-relative distance from now ("3 days ago") in the active locale.
 */
export function formatRelative(iso: string) {
  const formatter = new Intl.RelativeTimeFormat(getLocale(), {
    numeric: "auto",
  });
  const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 60) return formatter.format(diffSeconds, "second");
  if (abs < 3600)
    return formatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400)
    return formatter.format(Math.round(diffSeconds / 3600), "hour");
  return formatter.format(Math.round(diffSeconds / 86400), "day");
}
