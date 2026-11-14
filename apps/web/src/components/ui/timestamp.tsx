import { getLocale } from "@/i18n/runtime";
import { formatRelative } from "@/lib/client/time";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Suspense, use } from "react";
import { browser } from "react-dom";

/**
 * Either `Intl.DateTimeFormat` options for a date in the app locale, or
 * `relative` for the distance from now ("3 days ago", or "3d ago" when
 * narrow) in the app locale.
 */
type Props = PropsWithClassName<
  { date: Date } & (
    | { format: Intl.DateTimeFormatOptions; relative?: never }
    | { relative: "long" | "narrow"; format?: never }
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
function TimestampText({ date, format, relative, className }: Props) {
  use(browser("Timestamps render in the viewer's timezone."));

  return (
    <time dateTime={date.toISOString()} className={cn(className)}>
      {relative === undefined
        ? new Intl.DateTimeFormat(getLocale(), format).format(date)
        : formatRelative(date, relative)}
    </time>
  );
}
