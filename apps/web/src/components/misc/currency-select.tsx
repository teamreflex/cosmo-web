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
 * The rates load with the select, which shows a disabled trigger until then.
 */
export default function CurrencySelect(props: Props) {
  const fallback = (
    <Select disabled value={props.value}>
      <CurrencyTrigger {...props} />
    </Select>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <CurrencySelectOptions {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

function CurrencyTrigger({
  id,
  placeholder = m.list_currency(),
  className,
}: Props) {
  return (
    <SelectTrigger id={id} className={className}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
  );
}

function CurrencySelectOptions(props: Props) {
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
    <Select
      name={props.name}
      value={props.value}
      onValueChange={(next) => {
        if (next !== null) props.onValueChange(next);
      }}
    >
      <CurrencyTrigger {...props} />
      <SelectContent className="max-h-72 w-auto max-w-(--available-width) min-w-(--anchor-width)">
        <SelectGroup>
          <SelectLabel>{m.currency_common()}</SelectLabel>
          {common.map(renderItem)}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>{m.currency_all()}</SelectLabel>
          {others.map(renderItem)}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
