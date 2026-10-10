import {
  useDisplayCurrency,
  useSaleConversionRate,
} from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import { PRICE_STATS_MIN_LISTINGS } from "@/lib/universal/objekts";
import { cn, formatPrice } from "@/lib/utils";

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
  const viewer = useDisplayCurrency();
  const rateToUsd = useSaleConversionRate(props.currency, props.fxRateToUsd);
  const listed =
    props.price != null ? formatPrice(props.price, props.currency) : null;
  const price =
    rateToUsd !== null && props.price != null
      ? viewer.formatUsd(props.price * rateToUsd)
      : listed;
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
      {rateToUsd !== null && (
        <span className="h-3.5 truncate text-xxs opacity-70">{listed}</span>
      )}
      {/* keep the price line to one line for the same reason */}
      <span className="flex w-full min-w-0 items-center justify-between">
        {price && <span className="truncate">{price}</span>}
        {market !== null && (
          <span className="ml-2 truncate opacity-70">
            {m.list_median_price({ price: market })}
          </span>
        )}
        <span className="ml-auto shrink-0 pl-2 whitespace-nowrap">
          x{props.quantity}
        </span>
      </span>
    </button>
  );
}
