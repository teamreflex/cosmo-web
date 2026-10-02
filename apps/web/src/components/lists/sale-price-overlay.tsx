import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn, formatPrice } from "@/lib/utils";
import { IconPlus } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { PropsWithChildren, ReactNode } from "react";
import PriceOverlay from "../objekt/price-overlay";

type Props = {
  collection: Objekt.Collection;
  price: number | null;
  currency: string;
  rateToUsd: number | null;
  // pill shown above the price, such as the market standing
  badge?: ReactNode;
  editable: boolean;
};

/**
 * A sale entry's price band in the viewer's currency, with the seller's
 * original price above it when the two differ. An unpriced entry prompts the
 * owner to add a price and tells anyone else to ask the seller.
 */
export default function SalePriceOverlay({
  collection,
  price,
  currency,
  rateToUsd,
  badge,
  editable,
}: Props) {
  const viewer = useDisplayCurrency();

  if (price === null) {
    return editable ? (
      <PriceOverlay
        collection={collection}
        price={
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-current/55 bg-black/25 px-2 font-sans text-xxs font-semibold @[180px]:h-7 @[180px]:gap-1.5 @[180px]:px-2.5 @[180px]:text-xs">
            <IconPlus className="size-3" />
            {m.list_sale_add_price()}
          </span>
        }
      />
    ) : (
      <PriceOverlay
        collection={collection}
        label={m.list_sale_no_price()}
        price={<span className="font-sans">{m.list_sale_ask_seller()}</span>}
      />
    );
  }

  const original = formatPrice(price, currency);

  if (currency === viewer.currency || rateToUsd === null) {
    return (
      <PriceOverlay collection={collection} badge={badge} price={original} />
    );
  }

  return (
    <PriceOverlay
      collection={collection}
      badge={badge}
      label={original}
      price={viewer.formatUsd(price * rateToUsd)}
    />
  );
}

const priceBadgeVariants = cva(
  "mb-1 max-w-full self-start truncate rounded-sm px-1.5 py-0.5 text-xxs leading-none font-semibold tracking-wider uppercase",
  {
    variants: {
      tone: {
        floor: "bg-emerald-300 text-black",
        undercut: "bg-amber-300 text-black",
        neutral: "bg-white/18 text-white",
      },
    },
  },
);

/**
 * Market standing pill for a sale price band.
 */
export function PriceBadge({
  tone,
  children,
}: PropsWithChildren<Required<VariantProps<typeof priceBadgeVariants>>>) {
  return <span className={cn(priceBadgeVariants({ tone }))}>{children}</span>;
}
