import { useDisplayCurrency } from "@/hooks/use-display-currency";
import type { ConvertedPrice } from "@/lib/utils";

type Props = {
  usd: number;
};

/**
 * A USD amount rendered in the viewer's display currency.
 */
export default function PriceDisplay({ usd }: Props) {
  const { formatUsd } = useDisplayCurrency();
  return <ApproxPrice price={formatUsd(usd)} />;
}

type ApproxPriceProps = {
  price: ConvertedPrice;
  className?: string;
};

/**
 * A converted price. A compact one keeps its whole value as a tooltip and for
 * screen readers.
 */
export function ApproxPrice({ price, className }: ApproxPriceProps) {
  if (price.text === price.full) {
    return <span className={className}>{price.text}</span>;
  }

  return (
    <span className={className} title={price.full}>
      <span aria-hidden>{price.text}</span>
      <span className="sr-only">{price.full}</span>
    </span>
  );
}
