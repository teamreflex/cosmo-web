import { cn } from "@/lib/utils";

type Props = {
  quantity: number;
  price: number | null;
  currency: string;
  backgroundColor: string;
  textColor: string;
  onClick?: () => void;
};

export default function SaleBar({
  quantity,
  price,
  currency,
  backgroundColor,
  textColor,
  onClick,
}: Props) {
  const formattedPrice = price != null ? formatPrice(price, currency) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "-mt-3 flex w-full items-center justify-between rounded-b-lg px-2 pt-4 pb-1.5 text-xs font-medium transition-[filter] md:rounded-b-xl lg:rounded-b-2xl",
        onClick && "cursor-pointer hover:brightness-90",
      )}
      style={{ backgroundColor, color: textColor }}
    >
      {formattedPrice && <span>{formattedPrice}</span>}
      <span className="ml-auto">x{quantity}</span>
    </button>
  );
}

/**
 * We allow freeform currency input, so fall back to it if the currency is not supported.
 */
function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price.toLocaleString("en", { maximumFractionDigits: 2 })} ${currency}`;
  }
}
