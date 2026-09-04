import { getVariantRibbon } from "@/components/objekt/variant-gradients";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn, formatPrice } from "@/lib/utils";

type Props = {
  collection: Pick<Objekt.Collection, "class" | "artist">;
  price: number | null;
  currency: string;
};

/**
 * Price band along the bottom of a sale list card. It rests on a black
 * gradient; hovering the card fades in the objekt's own background and text
 * colours, the pairing the sidebar already relies on, to show the card is
 * clickable. Special and idntt Unit objekts fade in their ribbon gradient
 * instead. An unpriced entry renders as zero so every band is the same height.
 */
export default function SaleOverlay({ collection, price, currency }: Props) {
  const ribbon = getVariantRibbon(collection);
  const tint =
    ribbon ??
    "linear-gradient(to top, var(--objekt-background-color) 0%, color-mix(in srgb, var(--objekt-background-color) 85%, transparent) 40%, transparent 100%)";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 isolate flex items-end pt-8 pr-[14%] pb-1.5 pl-2 text-white transition-colors group-hover/objekt:text-(--objekt-text-color) @[180px]:pb-2.5 @[180px]:pl-3">
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
      <span className="truncate font-mono text-xs font-bold tabular-nums @[180px]:text-base">
        {formatPrice(price ?? 0, currency)}
      </span>
    </div>
  );
}
