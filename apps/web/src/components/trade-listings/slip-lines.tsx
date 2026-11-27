import { m } from "@/i18n/messages";
import type { SlipLine } from "@/lib/universal/listing-slip";
import { cn } from "@/lib/utils";
import { SlipChipItem } from "./slip-chips";

/**
 * A side's lines of chips. A gutter holds each line's "+", "or" or option
 * number, and a slot after it each want's count, so chips line up across
 * lines; a side with no marks or counts leaves them out. A phone card's
 * half is narrow, so a row there drops an empty gutter and a count column
 * that would only read "1×", which an expanded panel keeps. From md a row's line of collections never
 * wraps: its collection chips truncate, so "+N" stays beside them. A line
 * of range values wraps instead, since its chips are short. An expanded
 * row's panel passes `grid`, which shows a line of collections as their
 * cards, wrapping as the column allows, an "any of" row's under a label
 * saying the claimer gives one of them.
 */
export function SlipLines({
  lines,
  grid = false,
}: {
  lines: readonly SlipLine[];
  grid?: boolean;
}) {
  const counted = lines.some((line) => line.count !== null);
  const marked = lines.some((line) => line.gutter !== null);
  const counts = lines.some((line) => line.count !== null && line.count > 1);
  return (
    <div className={cn("flex min-w-0 flex-col", grid ? "gap-2" : "gap-1")}>
      {lines.map((line) => {
        const cards =
          grid && line.chips.some((chip) => chip.kind === "collection");
        return (
          <div key={line.key} className="flex min-w-0 items-start gap-1.25">
            {(counted || marked) && (
              <span
                className={cn(
                  // as tall as a chip, or a grid's label, so the mark sits beside its first chips when they wrap
                  "flex w-4.5 shrink-0 items-center justify-center",
                  grid ? "h-5" : "h-6",
                  !marked && "max-md:hidden",
                )}
              >
                <Gutter gutter={line.gutter} />
              </span>
            )}
            {counted && (
              <span
                className={cn(
                  "flex w-6 shrink-0 items-center font-mono text-sm font-bold text-amber-700 tabular-nums dark:text-amber-500",
                  grid ? "h-5" : "h-6",
                  !grid && !counts && "max-md:hidden",
                )}
              >
                {line.count !== null && `${line.count}×`}
              </span>
            )}
            {cards ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {line.anyOf && (
                  <span className="flex h-5 items-center text-xs text-muted-foreground">
                    {m.listing_slip_any_one_of()}
                  </span>
                )}
                <ul className="flex min-w-0 flex-wrap gap-2">
                  {line.chips.map((chip) => (
                    <SlipChipItem key={chip.key} chip={chip} card />
                  ))}
                </ul>
              </div>
            ) : (
              <ul
                className={cn(
                  "flex min-w-0 flex-1 flex-wrap items-center gap-1.25",
                  line.chips.some((chip) => chip.kind === "collection") &&
                    "md:flex-nowrap md:overflow-hidden",
                )}
              >
                {line.chips.map((chip) => (
                  <SlipChipItem key={chip.key} chip={chip} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
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
