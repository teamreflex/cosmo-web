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
import { getLocale } from "@/i18n/runtime";
import { fxCurrenciesQuery } from "@/lib/queries/fx";
import {
  commonCurrencies,
  DEFAULT_CURRENCY,
} from "@/lib/universal/schema/currency";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  id?: string;
  name?: string;
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/**
 * Picks a currency with an FX rate: the common ones first, then the rest.
 * The options load when the menu opens, so the trigger shows the raw code.
 */
export default function CurrencySelect({
  id,
  name,
  value,
  onValueChange,
  placeholder = m.list_currency(),
  className,
}: Props) {
  return (
    <Select
      name={name}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
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
  const names = new Intl.DisplayNames(getLocale(), { type: "currency" });
  // USD is the base of every rate, so it's offered even without a row
  const common = commonCurrencies.filter(
    (currency) =>
      currency === DEFAULT_CURRENCY || currencies.includes(currency),
  );
  const others = currencies.filter(
    (currency) => !commonCurrencies.some((c) => c === currency),
  );

  function renderItem(currency: string) {
    const name = names.of(currency);
    return (
      // typeahead matches the code, not the name
      <SelectItem key={currency} value={currency} label={currency}>
        {name === undefined || name === currency
          ? currency
          : `${currency} · ${name}`}
      </SelectItem>
    );
  }

  return (
    <>
      <SelectGroup>
        <SelectLabel>{m.currency_common()}</SelectLabel>
        {common.map(renderItem)}
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>{m.currency_all()}</SelectLabel>
        {others.map(renderItem)}
      </SelectGroup>
    </>
  );
}
