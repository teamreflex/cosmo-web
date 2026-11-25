import { m } from "@/i18n/messages";
import type { SlipLine } from "@/lib/universal/listing-slip";
import { cn } from "@/lib/utils";
import { type ChipSize, SlipChipItem } from "./slip-chips";

// a chip's height, which a line's gutter and count centre on, so they sit beside its first chips when they wrap
const lineHeights = { sm: "h-6", md: "h-7" } satisfies Record<ChipSize, string>;

/**
 * A side's lines of chips. A gutter holds each line's "+", "or" or option
 * number, and a slot after it each want's count, so chips line up across
 * lines; a side with no marks or counts leaves them out. A phone card's
 * half is narrow, so a row there drops an empty gutter and a count column
 * that would only read "1×". From md a row's line of collections never
 * wraps: its collection chips truncate, so "+N" stays beside them. A line
 * of range values wraps instead, since its chips are short. Blocks that
 * must line up with each other, such as a preview's options, pass
 * `counted` so one without counts keeps the count column too.
 */
export function SlipLines({
  lines,
  size,
  counted = lines.some((line) => line.count !== null),
}: {
  lines: readonly SlipLine[];
  size: ChipSize;
  counted?: boolean;
}) {
  const marked = lines.some((line) => line.gutter !== null);
  const counts = lines.some((line) => line.count !== null && line.count > 1);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {lines.map((line) => (
        <div key={line.key} className="flex min-w-0 items-start gap-1.25">
          {(counted || marked) && (
            <span
              className={cn(
                "flex w-4.5 shrink-0 items-center justify-center",
                lineHeights[size],
                size === "sm" && !marked && "max-md:hidden",
              )}
            >
              <Gutter gutter={line.gutter} />
            </span>
          )}
          {counted && (
            <span
              className={cn(
                "flex shrink-0 items-center font-mono font-bold text-amber-700 tabular-nums dark:text-amber-500",
                lineHeights[size],
                size === "sm" ? "w-6 text-sm" : "w-8.5 text-base",
                size === "sm" && !counts && "max-md:hidden",
              )}
            >
              {line.count !== null && `${line.count}×`}
            </span>
          )}
          <ul
            className={cn(
              "flex min-w-0 flex-1 flex-wrap items-center gap-1.25",
              size === "sm" &&
                line.chips.some((chip) => chip.kind === "collection") &&
                "md:flex-nowrap md:overflow-hidden",
            )}
          >
            {line.chips.map((chip) => (
              <SlipChipItem key={chip.key} chip={chip} size={size} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Gutter({ gutter }: { gutter: SlipLine["gutter"] }) {
  switch (gutter?.kind) {
    case undefined:
      return null;
    case "and":
      return (
        <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-500">
          +
        </span>
      );
    case "or":
      return (
        <span className="text-xxs font-medium text-muted-foreground">
          {m.listing_range_or()}
        </span>
      );
    case "option":
      return (
        <span className="inline-flex size-4.5 items-center justify-center rounded-full border border-foreground/25 font-mono text-xxs leading-none font-bold text-muted-foreground">
          <span aria-hidden>{gutter.number}</span>
          <span className="sr-only">
            {m.listing_option_label({ number: gutter.number })}
          </span>
        </span>
      );
  }
}
