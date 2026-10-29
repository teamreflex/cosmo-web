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

/**
 * The distance from now in the locale. Where the narrow style is only a
 * sign and a number ("-18 min" in French), the short style reads instead
 * ("il y a 18 min"). Japanese reads narrow in both styles, since its long
 * style puts a space between the number and the unit ("4 時間前").
 */
export function formatRelative(
  date: Date,
  style: "long" | "narrow",
  locale = getLocale(),
) {
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const [value, unit] = relativeUnit(diffSeconds);
  const format = (as: Intl.RelativeTimeFormatStyle) =>
    new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: as }).format(
      value,
      unit,
    );

  const text = format(locale === "ja" ? "narrow" : style);
  return /^[+\-\u2212]/.test(text) ? format("short") : text;
}

function relativeUnit(
  diffSeconds: number,
): [number, Intl.RelativeTimeFormatUnit] {
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return [diffSeconds, "second"];
  if (abs < 3600) return [Math.round(diffSeconds / 60), "minute"];
  if (abs < 86400) return [Math.round(diffSeconds / 3600), "hour"];
  return [Math.round(diffSeconds / 86400), "day"];
}

/**
 * Hours and minutes from `now` until `deadline`, a part minute counting as
 * one so it only reads zero once the deadline has passed.
 */
export function timeLeft(now: Date, deadline: Date) {
  const minutes = Math.max(
    0,
    Math.ceil((deadline.getTime() - now.getTime()) / 60_000),
  );
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}
