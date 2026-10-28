import { getLocale } from "@/i18n/runtime";
import { formatRelative } from "@/lib/client/time";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
import { Suspense, use } from "react";
import { browser } from "react-dom";

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

export function Timestamp(props: Props) {
  return (
    <Suspense
      fallback={
        /**
         * A span one line tall, top-aligned and in the timestamp's own text
         * size, so it takes the same space as the text it stands in for and
         * can sit inside a paragraph.
         */
        <span
          aria-hidden
          className={cn(
            "inline-block h-[1lh] w-20 animate-pulse rounded-full bg-muted align-top",
            props.className,
          )}
        />
      }
    >
      <TimestampText {...props} />
    </Suspense>
  );
}

/**
 * The formatted date, which only the browser renders: it's in the viewer's
 * timezone, or relative to the viewer's clock.
 */
function TimestampText({ date, format, relative, className, showTime }: Props) {
  use(browser("Timestamps render in the viewer's timezone."));

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
