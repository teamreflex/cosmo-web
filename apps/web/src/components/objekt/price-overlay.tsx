import { getVariantRibbon } from "@/components/objekt/variant-gradients";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { type ReactNode, useId } from "react";

type Props = {
  collection: Pick<Objekt.Collection, "class" | "artist">;
  // pills shown in a row above the label
  badges?: ReactNode;
  // small line above the price, styled by the caller
  label?: ReactNode;
  price: ReactNode;
  // turns the price into a button with this accessible name
  action?: PriceAction;
};

type PriceAction = {
  label: string;
  onClick: () => void;
};

/**
 * Full objekt-size mask providing a sidebar cutout for the gradient to sit "under".
 */
const BAND_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 550 850'%3E%3Cpath fill-rule='evenodd' d='M0 0H550V850H0Z M510.3 51.9H620V799H510.3A18.6 18.6 0 0 1 491.7 780.4V70.5A18.6 18.6 0 0 1 510.3 51.9Z'/%3E%3C/svg%3E")`;

/**
 * Price band along the bottom of an objekt card. The band lets clicks through
 * to the card, apart from the price when it has an action.
 */
export default function PriceOverlay({
  collection,
  badges,
  label,
  price,
  action,
}: Props) {
  const contentId = useId();
  const ribbon = getVariantRibbon(collection);
  const tint =
    ribbon ??
    "linear-gradient(to top, var(--objekt-background-color) 0%, color-mix(in srgb, var(--objekt-background-color) 85%, transparent) 40%, transparent 100%)";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 isolate flex items-end mask-size-[100%_auto] mask-bottom mask-no-repeat pt-8 pr-[14%] pb-1.5 pl-2 text-white transition-colors group-hover/objekt:text-(--objekt-text-color) @[180px]:pb-2.5 @[180px]:pl-3"
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
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          aria-describedby={contentId}
          className="pointer-events-auto -mx-1.5 -mb-1 flex max-w-full min-w-0 cursor-pointer rounded-md px-1.5 py-1 text-left transition-colors outline-none hover:bg-current/10 focus-visible:ring-2 focus-visible:ring-current"
        >
          <PriceContent
            id={contentId}
            badges={badges}
            label={label}
            price={price}
          />
        </button>
      ) : (
        <PriceContent badges={badges} label={label} price={price} />
      )}
    </div>
  );
}

type PriceContentProps = Pick<Props, "badges" | "label" | "price"> & {
  id?: string;
};

function PriceContent({ id, badges, label, price }: PriceContentProps) {
  return (
    <span id={id} className="flex min-w-0 flex-col">
      {badges && <span className="mb-1 flex min-w-0 gap-1">{badges}</span>}
      {label && (
        <span className="truncate text-xxs leading-3 opacity-70">{label}</span>
      )}
      <span className="truncate font-mono text-xs font-bold tabular-nums @[180px]:text-base">
        {price}
      </span>
    </span>
  );
}
