import { cn } from "@/lib/utils";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps, ReactNode } from "react";
import { Collapse } from "../ui/collapse";

/**
 * The parts of a trade slip, shared by the Listings feed, My trades and
 * their skeletons, so a skeleton lays out as its row by construction. Below
 * md a slip is a card of two tinted halves stacked over a footer, from md
 * one line, and from lg its variant's columns under a SlipColumnHeader. Nothing here
 * reads a row, so a route's skeleton can import it without the rows.
 */
type Variant = "listing" | "trade";

/**
 * md: give, divider, get. lg: listing is type, offering, arrow or ratio,
 * asking, from; trade is type, you send, arrow, you get, status, with,
 * time, its fixed columns narrower until xl so a single objekt's name and
 * number fit. A listing's divider is as wide as its ratio pill, its rows
 * and header keep room at their end for the row's expand button, and its
 * rows space their expanded panel and footer themselves (SlipPanel,
 * ListingSlipFooter), since a closed panel's empty grid row would add a gap.
 */
const columns = {
  listing:
    "md:grid-cols-[minmax(0,1.2fr)_56px_minmax(0,1.4fr)] lg:grid-cols-[96px_minmax(0,1.25fr)_56px_minmax(0,1.4fr)_170px] md:pr-14 md:gap-y-0",
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
          "grid text-sm md:items-center md:gap-x-3.5 md:gap-y-2.5 md:px-4 md:py-3",
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

// a side's column from md and its tint on a phone card, shared by its half and its expanded panel
const sides = {
  give: "md:col-start-1 lg:col-start-2 max-md:bg-teal-700/5 max-md:dark:bg-teal-500/5",
  get: "md:col-start-3 lg:col-start-4 max-md:bg-amber-700/5 max-md:dark:bg-amber-500/5",
};

// a phone card stacks what is given, its expanded panel, the divider, what is got and its panel
const halfRows = {
  give: "max-md:row-start-1",
  get: "max-md:row-start-4",
} satisfies Record<keyof typeof sides, string>;

const panelRows = {
  give: "max-md:row-start-2",
  get: "max-md:row-start-5",
} satisfies Record<keyof typeof sides, string>;

/**
 * One side of the trade, its tiles then its words: what the poster or
 * viewer gives, or what they get, each tinted on a card. A phone card puts
 * `corner` at the half's top end, beside its words.
 */
export function SlipHalf({
  side,
  label,
  thumbs,
  corner,
  children,
}: {
  side: keyof typeof sides;
  /** names the side to a screen reader; a skeleton has none */
  label?: string;
  thumbs: ReactNode;
  corner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 max-md:p-3 md:row-start-1 md:gap-2.5",
        halfRows[side],
        sides[side],
      )}
    >
      {label !== undefined && <span className="sr-only">{label}</span>}
      {thumbs}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
      {corner !== undefined && (
        <div className="flex shrink-0 gap-1.5 self-start md:hidden">
          {corner}
        </div>
      )}
    </div>
  );
}

/**
 * A side's expanded panel, which opens under its half: an inset box in the
 * half's tint on a phone card, and from md a column of the row's second
 * line, its words under the half's words, over the box SlipPanelBox draws
 * across the row.
 */
export function SlipPanel({
  side,
  open,
  id,
  children,
}: {
  side: keyof typeof sides;
  open: boolean;
  id: string;
  children: ReactNode;
}) {
  return (
    <Collapse
      id={id}
      open={open}
      className={cn(
        "relative z-1 min-w-0 md:row-start-2 md:self-start",
        panelRows[side],
        sides[side],
      )}
    >
      <div className="max-md:px-3 max-md:pb-3 md:pt-5.5 md:pb-3 md:pl-14.5">
        <div className="max-md:rounded-md max-md:border max-md:border-border/60 max-md:bg-background max-md:p-2.5">
          {children}
        </div>
      </div>
    </Collapse>
  );
}

// from md, the inset box behind an open row's panels, across the row
export function SlipPanelBox({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "max-md:hidden md:col-span-full md:row-start-2 md:mt-2.5 md:-mr-12 md:-ml-2 md:self-stretch md:rounded-md md:border md:border-border/60 md:bg-background",
        !open && "md:hidden",
      )}
    />
  );
}

// between the halves: a dashed rule across a phone card, whose arrow or ratio sits on its middle; from md its own column
export function SlipDivider({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "relative text-muted-foreground max-md:row-start-3 max-md:border-t max-md:border-dashed md:col-start-2 md:row-start-1 lg:col-start-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Where each card of a fan sits, front first: the front card upright, the
 * ones behind it turned further out.
 */
const fanPlacements = [
  "z-3 top-1.5 left-0",
  "z-2 top-1 left-1.25 rotate-3",
  "z-1 top-0.5 left-2.5 rotate-8",
];

// below md a fan is only as wide as its cards, so a lone card sits by its chips; from md every fan is as wide as three, so a list's chips line up
const fanWidths = ["max-md:w-8", "max-md:w-9.25", "max-md:w-10.5"];

/**
 * A fan of up to three photocard-sized cards, `count` of them.
 */
export function SlipFanFrame({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative isolate h-15 shrink-0 md:w-12",
        fanWidths[Math.min(Math.max(count, 1), fanWidths.length) - 1],
      )}
    >
      {children}
    </span>
  );
}

export function SlipFanCard({
  index,
  render,
  ...props
}: useRender.ComponentProps<"span"> & { index: number }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(
          "absolute flex h-12.5 w-8 overflow-hidden rounded-[3px] ring-1 ring-card",
          fanPlacements[index],
        ),
      },
      props,
    ),
    render,
  });
}

/**
 * A listing slip's footer. Below md one line: the end, then the time, with
 * room at its far end for the row's Show all button; the type badges sit in
 * the offering half's corner instead (SlipHalf's `corner`). From md one
 * line of badges, time and end; from lg each takes its column.
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
    <span className="col-span-full flex min-w-0 items-center gap-1.5 max-md:row-start-6 max-md:border-t max-md:border-dashed max-md:py-2 max-md:pr-28 max-md:pl-3 max-md:text-xs md:row-start-3 md:mt-2.5 md:gap-2 lg:contents">
      <span className="flex items-center gap-2 max-md:contents lg:col-start-1 lg:row-start-1 lg:flex-col lg:items-start lg:gap-1">
        <span className="flex shrink-0 gap-1.5 max-md:hidden md:contents">
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
    <span className="col-span-full flex min-w-0 items-center gap-2 max-md:row-start-6 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-1.5 max-md:border-t max-md:border-dashed max-md:px-3 max-md:py-2 max-md:text-xs md:row-start-2 lg:contents">
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

/**
 * A slip's muted second line, truncated with its full text in a tooltip.
 */
export function SlipDetail({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  return (
    <span
      dir="auto"
      title={children}
      className={cn("truncate text-xs text-muted-foreground", className)}
    >
      {children}
    </span>
  );
}
