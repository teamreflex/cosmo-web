import { m } from "@/i18n/messages";
import type { SlipLine } from "@/lib/universal/listing-slip";
import { cn } from "@/lib/utils";
import { SlipChipItem } from "./slip-chips";

/**
 * A side's lines of chips. A gutter holds each line's "+", "or" or option
 * number, and a slot after it each want's count, so chips line up across
 * lines; a side with no marks or counts leaves them out. A phone card's
 * half is narrow, so a row there drops an empty gutter and a count column
 * that would only read "1×". From md a row's line of collections never
 * wraps: its collection chips truncate, so "+N" stays beside them. A line
 * of range values wraps instead, since its chips are short. An expanded
 * row's panel passes `list`, which shows each collection as a row of its
 * picture, name and serial, as the profile's trade rows list transfers.
 */
export function SlipLines({
  lines,
  list = false,
}: {
  lines: readonly SlipLine[];
  list?: boolean;
}) {
  const counted = lines.some((line) => line.count !== null);
  const marked = lines.some((line) => line.gutter !== null);
  const counts = lines.some((line) => line.count !== null && line.count > 1);
  return (
    <div className={cn("flex min-w-0 flex-col", list ? "gap-1.5" : "gap-1")}>
      {lines.map((line) => {
        /**
         * A line's gutter and count centre on its chip's height, so they sit
         * beside its first chips when they wrap, or on a listed collection's
         * picture.
         */
        const height =
          list && line.chips[0]?.kind === "collection" ? "h-9.25" : "h-6";
        return (
          <div key={line.key} className="flex min-w-0 items-start gap-1.25">
            {(counted || marked) && (
              <span
                className={cn(
                  "flex w-4.5 shrink-0 items-center justify-center",
                  height,
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
                  height,
                  !counts && "max-md:hidden",
                )}
              >
                {line.count !== null && `${line.count}×`}
              </span>
            )}
            <ul
              className={cn(
                "flex min-w-0 flex-1 flex-wrap items-center gap-1.25",
                line.chips.some((chip) => chip.kind === "collection") &&
                  "md:flex-nowrap md:overflow-hidden",
              )}
            >
              {line.chips.map((chip) => (
                <SlipChipItem key={chip.key} chip={chip} list={list} />
              ))}
            </ul>
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
