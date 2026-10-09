import { useHydrated } from "@/hooks/use-hydrated";
import { getLocale } from "@/i18n/runtime";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
import { Skeleton } from "./skeleton";

/**
 * Either a date-fns `format` pattern, `Intl.DateTimeFormat` options for a
 * date in the app locale, or `relative` for the distance from now ("3 days
 * ago", or "3d ago" when narrow) in the app locale.
 */
type Props = PropsWithClassName<
  { date: Date } & (
    | { format: string; showTime?: boolean; relative?: never }
    | {
        format: Intl.DateTimeFormatOptions;
        showTime?: never;
        relative?: never;
      }
    | { relative: "long" | "narrow"; format?: never; showTime?: never }
  )
>;

export function Timestamp({
  date,
  format,
  relative,
  className,
  showTime,
}: Props) {
  // defer to client render to avoid hydration mismatch from timezone differences
  const hydrated = useHydrated();
  if (!hydrated) {
    return <Skeleton className="inline-block h-4 w-20 rounded-full" />;
  }

  return (
    <time dateTime={date.toISOString()} className={cn(className)}>
      {relative === undefined
        ? formatAbsolute(date, format, showTime)
        : formatRelative(date, relative)}
    </time>
  );
}

function formatAbsolute(
  date: Date,
  format: string | Intl.DateTimeFormatOptions,
  showTime: boolean | undefined,
) {
  if (typeof format === "string") {
    return formatDate(date, showTime ? `${format} h:mm a` : format);
  }
  return new Intl.DateTimeFormat(getLocale(), format).format(date);
}

function formatRelative(date: Date, style: "long" | "narrow") {
  const formatter = new Intl.RelativeTimeFormat(getLocale(), {
    numeric: "auto",
    style,
  });
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 60) return formatter.format(diffSeconds, "second");
  if (abs < 3600)
    return formatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400)
    return formatter.format(Math.round(diffSeconds / 3600), "hour");
  return formatter.format(Math.round(diffSeconds / 86400), "day");
}
