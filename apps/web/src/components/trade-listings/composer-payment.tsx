import { m } from "@/i18n/messages";
import { paymentMethodLabel } from "@/lib/client/trade-listings";
import { cn } from "@/lib/utils";
import { type PaymentMethod, paymentMethods } from "@apollo/database/web/types";
import { IconPlus, IconX } from "@tabler/icons-react";
import CurrencySelect from "../misc/currency-select";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type AmountProps = {
  currency: string;
  amount: string;
  /** names the amount field */
  label: string;
  onChange: (amount: string) => void;
  onRemove: () => void;
};

/**
 * The amount field of a payment as typed, in the listing's currency, with
 * at most two decimals in every currency.
 */
function AmountField({
  currency,
  amount,
  label,
  onChange,
}: Pick<AmountProps, "currency" | "amount" | "label" | "onChange">) {
  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-sm text-muted-foreground">
        {currency}
      </span>
      <Input
        aria-label={label}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        value={amount}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-28 font-mono font-bold tabular-nums"
      />
    </span>
  );
}

function RemoveButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={onRemove}
      className="ml-auto shrink-0 text-muted-foreground"
    >
      <IconX />
    </Button>
  );
}

/**
 * The payment row among the want rows: what the claimer pays for each
 * trade.
 */
export function ComposerPaymentRow(props: AmountProps) {
  return (
    <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-amber-500/40 bg-background py-1.5 pr-1.5 pl-3">
      <span className="w-16 shrink-0 text-xxs font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-400">
        {m.listing_detail_kind_payment()}
      </span>
      <AmountField {...props} />
      <span className="text-sm text-muted-foreground">
        {m.listing_detail_payment_each()}
      </span>
      <RemoveButton
        label={m.listing_composer_payment_remove()}
        onRemove={props.onRemove}
      />
    </div>
  );
}

/**
 * The poster's payment on top of their objekts, set, or the button that
 * adds it, disabled while the want rows hold a payment, since a listing's
 * payment sits on one side.
 */
export function ComposerOfferedPayment({
  payment,
  disabled,
  onAdd,
}: {
  payment: AmountProps | null;
  disabled: boolean;
  onAdd: () => void;
}) {
  if (payment === null) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onAdd}
        className="self-start border border-dashed border-teal-500/50 max-md:h-10"
      >
        <IconPlus />
        {m.listing_detail_kind_payment()}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-md border border-teal-500/35 bg-teal-500/5 py-1.5 pr-1.5 pl-3">
      <span className="shrink-0 text-xxs font-semibold tracking-widest text-teal-700 uppercase dark:text-teal-400">
        {m.listing_composer_payment_and()}
      </span>
      <AmountField {...payment} />
      <span className="text-sm text-muted-foreground">
        {m.listing_composer_payment_on_top()}
      </span>
      <RemoveButton
        label={m.listing_composer_payment_remove()}
        onRemove={payment.onRemove}
      />
    </div>
  );
}

/**
 * The listing's payment terms, shown once either side has a payment: its
 * currency, and the methods it may arrive by, Other included. Handles are
 * swapped in the trade chat, so the listing holds none.
 */
export function ComposerPaymentStrip({
  currency,
  methods,
  paying,
  onCurrency,
  onMethods,
}: {
  currency: string;
  methods: readonly PaymentMethod[];
  /** the poster pays, so the methods are the ones they pay by */
  paying: boolean;
  onCurrency: (currency: string) => void;
  onMethods: (methods: PaymentMethod[]) => void;
}) {
  return (
    <section
      aria-label={m.listing_detail_kind_payment()}
      className="flex flex-col gap-3 border-t border-amber-500/30 bg-amber-500/5 px-4 py-4 md:px-5"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="text-xxs font-medium tracking-widest text-amber-700 uppercase dark:text-amber-500">
          {m.listing_detail_kind_payment()}
        </span>
        <CurrencySelect
          value={currency}
          onValueChange={onCurrency}
          ariaLabel={m.listing_composer_payment_currency()}
          className="h-9 w-28"
        />
      </div>
      <div
        role="group"
        aria-label={
          paying
            ? m.listing_composer_payment_methods_paying()
            : m.listing_composer_payment_methods()
        }
        className="flex flex-wrap items-center gap-1.5"
      >
        {paymentMethods.map((method) => {
          const on = methods.includes(method);
          return (
            <button
              key={method}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onMethods(
                  on
                    ? methods.filter((each) => each !== method)
                    : paymentMethods.filter(
                        (each) => each === method || methods.includes(each),
                      ),
                )
              }
              className={cn(
                "h-8 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cosmo",
                on
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-300"
                  : "border-input text-muted-foreground hover:text-foreground",
              )}
            >
              {paymentMethodLabel(method)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
