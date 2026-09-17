import { getVariantRibbon } from "@/components/objekt/variant-gradients";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  collection: Pick<Objekt.Collection, "class" | "artist">;
  label?: string;
  price: ReactNode;
  trailing?: string;
};

/**
 * Full objekt-size mask providing a sidebar cutout for the gradient to sit "under".
 */
const BAND_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 550 850'%3E%3Cpath fill-rule='evenodd' d='M0 0H550V850H0Z M510.3 51.9H620V799H510.3A18.6 18.6 0 0 1 491.7 780.4V70.5A18.6 18.6 0 0 1 510.3 51.9Z'/%3E%3C/svg%3E")`;

/**
 * Price band along the bottom of an objekt card.
 */
export default function PriceOverlay({
  collection,
  label,
  price,
  trailing,
}: Props) {
  const ribbon = getVariantRibbon(collection);
  const tint =
    ribbon ??
    "linear-gradient(to top, var(--objekt-background-color) 0%, color-mix(in srgb, var(--objekt-background-color) 85%, transparent) 40%, transparent 100%)";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 isolate flex items-end justify-between gap-2 mask-size-[100%_auto] mask-bottom mask-no-repeat pt-8 pr-[14%] pb-1.5 pl-2 text-white transition-colors group-hover/objekt:text-(--objekt-text-color) @[180px]:pb-2.5 @[180px]:pl-3"
      style={{ maskImage: BAND_MASK }}
    >
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-black/78 to-transparent transition-opacity group-hover/objekt:opacity-0"
      />
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 opacity-0 transition-opacity group-hover/objekt:opacity-100",
          ribbon && "mask-[linear-gradient(to_top,black_40%,transparent)]",
        )}
        style={{ background: tint }}
      />
      <span className="flex min-w-0 flex-col">
        {label && (
          <span className="text-[9px] leading-3 font-medium tracking-[0.08em] uppercase opacity-70 @[180px]:text-xxs">
            {label}
          </span>
        )}
        <span className="truncate font-mono text-xs font-bold tabular-nums @[180px]:text-base">
          {price}
        </span>
      </span>
      {trailing && (
        <span className="shrink-0 text-[10px] leading-4 font-medium opacity-80 @[180px]:text-[11px]">
          {trailing}
        </span>
      )}
    </div>
  );
}
