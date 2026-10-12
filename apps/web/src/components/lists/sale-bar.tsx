import { useSaleConversionRate } from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import { PRICE_STATS_MIN_LISTINGS } from "@/lib/universal/objekts";
import { cn, formatPrice } from "@/lib/utils";
import { ApproxPrice } from "../objekt/price-display";

type Props = {
  quantity: number;
  price: number | null;
  currency: string;
  medianPriceUsd: number | null;
  listingCount: number;
  fxRateToUsd: number | null;
  backgroundColor: string;
  textColor: string;
  onClick?: () => void;
};

/**
 * A sale entry's price, market median and quantity under its card. The median
 * shows in the viewer's display currency. When the list's prices convert into
 * it too, the seller's own price sits on a small line above the converted one.
 */
export default function SaleBar(props: Props) {
  const { viewer, rate } = useSaleConversionRate(
    props.currency,
    props.fxRateToUsd,
  );
  const listed =
    props.price != null ? formatPrice(props.price, props.currency) : null;
  const market =
    props.medianPriceUsd !== null &&
    props.listingCount >= PRICE_STATS_MIN_LISTINGS
      ? viewer.formatUsd(props.medianPriceUsd)
      : null;

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.onClick}
      className={cn(
        "-mt-3 flex w-full min-w-0 flex-col rounded-b-photocard px-2 pt-4 pb-1.5 text-left text-xs font-medium transition-[filter]",
        props.onClick && "cursor-pointer hover:brightness-90",
      )}
      style={{ backgroundColor: props.backgroundColor, color: props.textColor }}
    >
      {/* the grid assumes a fixed cell height, so the line keeps its height when unpriced */}
      {rate !== null && (
        <span className="h-3.5 truncate text-xxs opacity-70">{listed}</span>
      )}
      {/* keep the price line to one line for the same reason */}
      <span className="flex w-full min-w-0 items-center">
        {props.price != null &&
          (rate === null ? (
            <span className="shrink-0 whitespace-nowrap">{listed}</span>
          ) : (
            <ApproxPrice
              price={viewer.formatUsd(props.price * rate)}
              className="shrink-0 whitespace-nowrap"
            />
          ))}
        {/* the leading empty box lets a median that doesn't fit wrap onto the clipped second row */}
        {market !== null && (
          <span className="flex h-4 min-w-0 flex-1 flex-wrap overflow-hidden before:h-4 before:content-['']">
            <span
              className="pl-2 whitespace-nowrap opacity-70"
              title={market.text === market.full ? undefined : market.full}
            >
              {m.list_median_price({ price: market.text })}
            </span>
          </span>
        )}
        {/* the price never gives way, so the quantity does on the narrowest cards */}
        <span className="ml-auto min-w-0 truncate pl-2">x{props.quantity}</span>
      </span>
    </button>
  );
}
