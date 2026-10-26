import { useHydrated } from "@/hooks/use-hydrated";
import { getLocale } from "@/i18n/runtime";
import { formatRelative } from "@/lib/client/time";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";

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
    /**
     * A span one line tall, top-aligned and in the timestamp's own text
     * size, so it takes the same space as the text it stands in for and can
     * sit inside a paragraph.
     */
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block h-[1lh] w-20 animate-pulse rounded-full bg-muted align-top",
          className,
        )}
      />
    );
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
