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

export default function SaleBar(props: Props) {
  const formattedPrice =
    props.price != null ? formatPrice(props.price, props.currency) : null;
  const market = convertMarket(
    props.medianPriceUsd,
    props.listingCount,
    props.currency,
    props.fxRateToUsd,
  );

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.onClick}
      className={cn(
        "-mt-3 flex w-full items-center justify-between rounded-b-photocard px-2 pt-4 pb-1.5 text-xs font-medium transition-[filter]",
        props.onClick && "cursor-pointer hover:brightness-90",
      )}
      style={{ backgroundColor: props.backgroundColor, color: props.textColor }}
    >
      {formattedPrice && <span>{formattedPrice}</span>}
      {market && (
        <span className="ml-2 opacity-70">
          {m.list_market_price({ price: market })}
        </span>
      )}
      <span className="ml-auto">x{props.quantity}</span>
    </button>
  );
}

/**
 * Convert the USD market median into the list's own currency when an FX rate
 * is available, otherwise fall back to USD. Returns null when there aren't
 * enough listings to display a meaningful market price.
 */
function convertMarket(
  medianPriceUsd: number | null,
  listingCount: number,
  currency: string,
  fxRateToUsd: number | null,
) {
  if (medianPriceUsd === null || listingCount < PRICE_STATS_MIN_LISTINGS) {
    return null;
  }
  if (fxRateToUsd && fxRateToUsd > 0) {
    return formatPrice(medianPriceUsd / fxRateToUsd, currency);
  }
  return formatPrice(medianPriceUsd, "USD");
}
