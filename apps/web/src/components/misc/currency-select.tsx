import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "@/i18n/messages";
import { fxCurrenciesQuery } from "@/lib/queries/fx";
import { commonCurrencies } from "@/lib/universal/schema/currency";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
};

/**
 * Picks a currency with an FX rate: the common ones first, then the rest.
 * The options load when the menu opens, so the trigger shows the raw code.
 */
export default function CurrencySelect({
  name,
  value,
  onValueChange,
  className,
}: Props) {
  return (
    <Select name={name} value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={m.list_currency()}>
          {value || undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Options />
          </Suspense>
        </ErrorBoundary>
      </SelectContent>
    </Select>
  );
}

function Options() {
  const { data: currencies } = useSuspenseQuery(fxCurrenciesQuery);
  const others = currencies.filter(
    (currency) => !commonCurrencies.some((common) => common === currency),
  );

  return (
    <>
      <SelectGroup>
        <SelectLabel>{m.currency_common()}</SelectLabel>
        {commonCurrencies.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {currency}
          </SelectItem>
        ))}
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>{m.currency_all()}</SelectLabel>
        {others.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {currency}
          </SelectItem>
        ))}
      </SelectGroup>
    </>
  );
}
