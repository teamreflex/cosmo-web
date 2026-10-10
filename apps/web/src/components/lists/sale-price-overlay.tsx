import { useSaleConversionRate } from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn, formatPrice } from "@/lib/utils";
import { IconPlus } from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { PropsWithChildren } from "react";
import { ApproxPrice } from "../objekt/price-display";
import PriceOverlay from "../objekt/price-overlay";

type Props = {
  collection: Objekt.Collection;
  price: number | null;
  currency: string;
  fxRateToUsd: number | null;
  quantity: number;
  atFloor: boolean;
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
  fxRateToUsd,
  quantity,
  atFloor,
  editable,
}: Props) {
  const { viewer, rate } = useSaleConversionRate(currency, fxRateToUsd);
  const badges =
    atFloor || quantity > 1 ? (
      <>
        {atFloor && (
          <PriceBadge tone="floor">{m.list_sale_floor_badge()}</PriceBadge>
        )}
        {quantity > 1 && (
          <PriceBadge tone="neutral">
            {m.list_sale_quantity_badge({ quantity: quantity.toString() })}
          </PriceBadge>
        )}
      </>
    ) : undefined;

  if (price === null) {
    return editable ? (
      <PriceOverlay
        collection={collection}
        badges={badges}
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
        badges={badges}
        label={m.list_sale_no_price()}
        price={<span className="font-sans">{m.list_sale_ask_seller()}</span>}
      />
    );
  }

  const listed = formatPrice(price, currency);

  return rate === null ? (
    <PriceOverlay collection={collection} badges={badges} price={listed} />
  ) : (
    <PriceOverlay
      collection={collection}
      badges={badges}
      label={listed}
      price={<ApproxPrice price={viewer.formatUsd(price * rate)} />}
    />
  );
}

const priceBadgeVariants = cva(
  "max-w-full truncate rounded-sm px-1.5 py-0.5 text-xxs leading-none font-semibold tracking-wider uppercase tabular-nums",
  {
    variants: {
      tone: {
        floor: "bg-emerald-300 text-black",
        neutral: "bg-white/18 text-white",
      },
    },
  },
);

/**
 * Pill above a sale price: the market standing, or the entry's quantity.
 */
function PriceBadge({
  tone,
  children,
}: PropsWithChildren<Required<VariantProps<typeof priceBadgeVariants>>>) {
  return <span className={cn(priceBadgeVariants({ tone }))}>{children}</span>;
}
