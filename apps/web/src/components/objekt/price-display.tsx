import { useDisplayCurrency } from "@/hooks/use-display-currency";

type Props = {
  usd: number;
};

/**
 * A USD amount rendered in the viewer's display currency.
 */
export default function PriceDisplay({ usd }: Props) {
  const { formatUsd } = useDisplayCurrency();
  return formatUsd(usd);
}
