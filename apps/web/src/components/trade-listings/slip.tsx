import { cn } from "@/lib/utils";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps, ReactNode } from "react";

/**
 * The parts of a trade slip, shared by the Listings feed, My trades and
 * their skeletons, so a skeleton lays out as its row by construction. Below
 * md a slip is a card of two tinted halves over a footer, from md one line,
 * and from lg its variant's columns under a SlipColumnHeader. Nothing here
 * reads a row, so a route's skeleton can import it without the rows.
 */
type Variant = "listing" | "trade";

/**
 * md: give, divider, get. lg: listing is type, offering, arrow or ratio,
 * asking, from; trade is type, you send, arrow, you get, status, with,
 * time, its fixed columns narrower until xl so a single objekt's name and
 * number fit.
 */
const columns = {
  listing:
    "md:grid-cols-[minmax(0,1.2fr)_16px_minmax(0,1.4fr)] lg:grid-cols-[96px_minmax(0,1.25fr)_56px_minmax(0,1.4fr)_170px]",
  trade:
    "md:grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] lg:grid-cols-[64px_minmax(0,1fr)_20px_minmax(0,1fr)_150px_114px_96px] xl:grid-cols-[72px_minmax(0,1fr)_20px_minmax(0,1fr)_150px_160px_100px]",
} satisfies Record<Variant, string>;

// cards with a gap below md, one bordered table from md
export function SlipList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col text-sm md:overflow-clip md:rounded-lg md:border md:bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SlipItems({
  render,
  ...props
}: useRender.ComponentProps<"ul">) {
  return useRender({
    defaultTagName: "ul",
    props: mergeProps<"ul">(
      { className: "flex flex-col gap-2.5 md:block" },
      props,
    ),
    render,
  });
}

// rules between the rows from md
export function SlipItem({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "md:border-t md:border-border/60 md:first:border-t-0",
        className,
      )}
    >
      {children}
    </li>
  );
}

/**
 * The slip's grid, a link on a row and a plain box in a skeleton.
 */
export function Slip({
  variant,
  render,
  ...props
}: useRender.ComponentProps<"div"> & { variant: Variant }) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "grid grid-cols-[minmax(0,1fr)_0_minmax(0,1fr)] text-sm md:items-center md:gap-x-3.5 md:gap-y-2.5 md:px-4 md:py-3",
          "max-md:overflow-hidden max-md:rounded-[10px] max-md:border max-md:bg-card",
          columns[variant],
        ),
      },
      props,
    ),
    render,
  });
}

/**
 * The lg column headings over a list of slips.
 */
export function SlipColumnHeader({
  variant,
  children,
}: {
  variant: Variant;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "sticky top-14 z-20 hidden gap-x-3.5 border-b bg-card/90 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-lg lg:grid",
        columns[variant],
      )}
    >
      {children}
    </div>
  );
}

const sides = {
  give: "col-start-1 lg:col-start-2 max-md:bg-teal-700/5 max-md:dark:bg-teal-500/5",
  get: "col-start-3 lg:col-start-4 max-md:bg-amber-700/5 max-md:dark:bg-amber-500/5",
};

/**
 * One side of the trade, its tiles then its words: what the poster or
 * viewer gives, or what they get, each tinted on a card.
 */
export function SlipHalf({
  side,
  label,
  thumbs,
  children,
}: {
  side: keyof typeof sides;
  /** names the side to a screen reader; a skeleton has none */
  label?: string;
  thumbs: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "row-start-1 flex min-w-0 flex-col items-start gap-2 max-md:p-3 sm:flex-row sm:items-center sm:gap-3 md:gap-2.5",
        sides[side],
      )}
    >
      {label !== undefined && <span className="sr-only">{label}</span>}
      {thumbs}
      <span className="flex max-w-full min-w-0 flex-col gap-0.5">
        {children}
      </span>
    </span>
  );
}

// between the halves: a dashed rule on a card, the arrow or ratio from md
export function SlipDivider({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "relative col-start-2 row-start-1 text-muted-foreground max-md:border-l max-md:border-dashed lg:col-start-3",
        className,
      )}
      {...props}
    />
  );
}

// an objekt's or a payment's picture, the size of a photocard
export function SlipTile({
  render,
  ...props
}: useRender.ComponentProps<"span">) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className:
          "aspect-photocard w-13 shrink-0 rounded-[3px] sm:w-11 md:w-9",
      },
      props,
    ),
    render,
  });
}

/**
 * A listing slip's footer. Below md one line: the end first, then the
 * time, then the type badges at its far end. From md one line of badges,
 * time and end; from lg each takes its column.
 */
export function ListingSlipFooter({
  types,
  time,
  end,
}: {
  types: ReactNode;
  time: ReactNode;
  end: ReactNode;
}) {
  return (
    <span className="col-span-full row-start-2 flex min-w-0 items-center gap-1.5 max-md:border-t max-md:border-dashed max-md:px-3 max-md:py-2 max-md:text-xs md:gap-2 lg:contents">
      <span className="flex items-center gap-2 max-md:contents lg:col-start-1 lg:row-start-1 lg:flex-col lg:items-start lg:gap-1">
        <span className="flex shrink-0 gap-1.5 max-md:order-2 max-md:ml-auto md:contents">
          {types}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground max-md:order-1">
          {time}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2 max-md:contents md:ml-2 lg:col-start-5 lg:row-start-1 lg:ml-0">
        {end}
      </span>
    </span>
  );
}

/**
 * A trade slip's footer. Below md two lines, the other party over the type
 * and the time over the status; from md one line; from lg each takes its
 * column.
 */
export function TradeSlipFooter({
  type,
  status,
  party,
  time,
}: {
  type: ReactNode;
  status: ReactNode;
  party: ReactNode;
  time: ReactNode;
}) {
  return (
    <span className="col-span-full row-start-2 flex min-w-0 items-center gap-2 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-1.5 max-md:border-t max-md:border-dashed max-md:px-3 max-md:py-2 max-md:text-xs lg:contents">
      <span className="flex max-md:col-start-1 max-md:row-start-2 lg:col-start-1 lg:row-start-1">
        {type}
      </span>
      {/* a long name gives way rather than wrapping the line */}
      <span className="flex max-w-48 min-w-0 shrink-0 max-md:col-start-2 max-md:row-start-2 max-md:justify-self-end lg:col-start-5 lg:row-start-1 lg:max-w-none">
        {status}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 max-md:col-start-1 max-md:row-start-1 lg:col-start-6 lg:row-start-1">
        {party}
      </span>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground max-md:col-start-2 max-md:row-start-1 lg:col-start-7 lg:row-start-1 lg:ml-0 lg:text-right">
        {time}
      </span>
    </span>
  );
}
