import { useHydrated } from "@/hooks/use-hydrated";
import { getLocale } from "@/i18n/runtime";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
import { Skeleton } from "./skeleton";

/**
 * Either a date-fns `format` pattern, or `relative` for the distance from now
 * ("3 days ago", or "3d ago" when narrow) in the app locale.
 */
type Props = PropsWithClassName<
  { date: Date } & (
    | { format: string; showTime?: boolean; relative?: never }
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
        ? formatDate(date, showTime ? `${format} h:mm a` : format)
        : formatRelative(date, relative)}
    </time>
  );
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
