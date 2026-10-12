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
  // set for the list's owner, whose price opens the entry editor
  onEdit?: () => void;
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
  onEdit,
}: Props) {
  const { viewer, rate } = useSaleConversionRate(currency, fxRateToUsd);
  const badges =
    atFloor || quantity > 1 ? (
      <>
        {atFloor && (
          <PriceBadge tone="floor">{m.market_floor()}</PriceBadge>
        )}
        {quantity > 1 && (
          <PriceBadge tone="neutral">
            {m.list_sale_quantity_badge({ quantity: quantity.toString() })}
          </PriceBadge>
        )}
      </>
    ) : undefined;

  if (price === null) {
    if (onEdit === undefined) {
      return (
        <PriceOverlay
          collection={collection}
          badges={badges}
          label={
            <span className="font-medium tracking-wider uppercase">
              {m.list_sale_no_price()}
            </span>
          }
          price={
            <span className="font-sans" title={m.list_sale_ask_seller()}>
              {m.list_sale_ask_seller()}
            </span>
          }
        />
      );
    }

    return (
      <PriceOverlay
        collection={collection}
        badges={badges}
        action={{
          label: m.aria_add_sale_price({ collection: collection.collectionId }),
          onClick: onEdit,
        }}
        price={
          <span
            title={m.list_sale_add_price()}
            className="inline-flex h-6 max-w-full items-center gap-0.5 rounded-md border border-dashed border-current/55 bg-black/25 px-1 font-sans text-xxs font-semibold @[180px]:h-7 @[180px]:gap-1.5 @[180px]:px-2.5 @[180px]:text-xs"
          >
            <IconPlus className="size-3 shrink-0" />
            <span className="truncate">{m.list_sale_add_price()}</span>
          </span>
        }
      />
    );
  }

  const listed = formatPrice(price, currency);
  const action =
    onEdit === undefined
      ? undefined
      : {
          label: m.aria_edit_sale_price({
            collection: collection.collectionId,
          }),
          onClick: onEdit,
        };

  return rate === null ? (
    <PriceOverlay
      collection={collection}
      badges={badges}
      price={listed}
      action={action}
    />
  ) : (
    <PriceOverlay
      collection={collection}
      badges={badges}
      label={
        <span className="font-mono tabular-nums" title={listed}>
          {listed}
        </span>
      }
      price={<ApproxPrice price={viewer.formatUsd(price * rate)} />}
      action={action}
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
