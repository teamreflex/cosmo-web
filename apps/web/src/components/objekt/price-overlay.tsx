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
 * Price band along the bottom of an objekt card. It rests on a black
 * gradient; hovering the card fades in the objekt's own background and text
 * colours, the pairing the sidebar already relies on, to show the card is
 * clickable. Special and idntt Unit objekts fade in their ribbon gradient
 * instead.
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 isolate flex items-end justify-between gap-2 pt-8 pr-[14%] pb-1.5 pl-2 text-white transition-colors group-hover/objekt:text-(--objekt-text-color) @[180px]:pb-2.5 @[180px]:pl-3">
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
