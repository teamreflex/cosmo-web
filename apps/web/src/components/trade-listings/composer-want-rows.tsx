import { m } from "@/i18n/messages";
import type { ComposerDisplay } from "@/lib/client/trade-listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  ListingFormValues,
  ListingFormWant,
} from "@/lib/universal/trade-listing-form";
import {
  addExactWant,
  canAddWant,
  canStep,
  stepCount,
  totalWanted,
} from "@apollo/trades/composer";
import type { ListingInput } from "@apollo/trades/listing";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useFieldArray, type UseFormReturn, useWatch } from "react-hook-form";
import { Button } from "../ui/button";
import { FieldError } from "../ui/field";
import ComposerChoiceRow from "./composer-choice-row";
import ComposerExactRow from "./composer-exact-row";
import ComposerExactSearch from "./composer-exact-search";
import { ComposerPaymentRow } from "./composer-payment";
import ComposerRangeRow from "./composer-range-row";
import ComposerStepper from "./composer-stepper";

type Props = {
  form: UseFormReturn<ListingFormValues, unknown, ListingInput>;
  display: ComposerDisplay;
  /** the listing's currency, which the payment row shows */
  currency: string;
  onCollection: (collection: Objekt.Collection) => void;
  /** a payment was added, which needs the listing's payment terms */
  onPaymentAdded: () => void;
  /** a payment was removed, which may leave the terms unused */
  onPaymentRemoved: () => void;
};

/**
 * What the poster asks for in return: exact rows for copies of one
 * collection, "any of" rows for any mix of a few named collections, range
 * rows for any objekts matching some values, in the order they're added,
 * and a payment row, kept last, while the poster isn't paying on top of
 * their objekts.
 */
export default function ComposerWantRows({
  form,
  display,
  currency,
  onCollection,
  onPaymentAdded,
  onPaymentRemoved,
}: Props) {
  const { control, formState } = form;
  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: "wants",
  });
  const [wants, offeredPayment] = useWatch({
    control,
    name: ["wants", "offeredPayment"],
  });
  const [searching, setSearching] = useState(false);
  const roomForRow = canAddWant(wants);
  const paymentRow = wants.findIndex((want) => want.kind === "payment");

  // objekt rows go above the payment row, which stays last
  function addRow(want: ListingFormWant) {
    if (paymentRow === -1) append(want);
    else insert(paymentRow, want);
  }
  const firstRange = wants.findIndex((want) => want.kind === "range");
  const validate = formState.isSubmitted;

  function setWant(index: number, want: ListingFormWant) {
    form.setValue(`wants.${index}`, want, {
      shouldDirty: true,
      shouldValidate: validate,
    });
  }

  function pickCollection(collection: Objekt.Collection) {
    onCollection(collection);
    const added = addExactWant(wants, collection.slug);
    const want = added.index === null ? undefined : added.wants[added.index];
    if (added.index !== null && want !== undefined) {
      if (added.index === wants.length) addRow(want);
      else setWant(added.index, want);
    }
    setSearching(false);
  }

  return (
    <section className="flex flex-col gap-3 px-4 py-4 md:px-5">
      <span className="text-xxs font-medium tracking-widest text-amber-700 uppercase dark:text-amber-500">
        {m.listing_composer_looking_for()}
      </span>

      <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
        <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
          {paymentRow !== -1 && totalWanted(wants) === 0
            ? m.listing_detail_kind_payment()
            : m.listing_composer_trade_total({ count: totalWanted(wants) })}
        </span>

        {fields.map((field, index) => {
          const want = wants[index];
          if (want === undefined) return null;
          if (want.kind === "payment") {
            return (
              <ComposerPaymentRow
                key={field.id}
                currency={currency}
                amount={want.amount}
                label={m.listing_composer_payment_amount()}
                onChange={(amount) => setWant(index, { ...want, amount })}
                onRemove={() => {
                  remove(index);
                  onPaymentRemoved();
                }}
              />
            );
          }
          const stepper = (
            <ComposerStepper
              value={want.count}
              canDecrement={canStep(wants, index, -1)}
              canIncrement={canStep(wants, index, 1)}
              onStep={(delta) =>
                setWant(index, {
                  ...want,
                  count: stepCount(wants, index, delta),
                })
              }
            />
          );

          switch (want.kind) {
            case "exact":
              return (
                <ComposerExactRow
                  key={field.id}
                  position={index + 1}
                  count={want.count}
                  slug={want.slug}
                  shown={display.collections.get(want.slug)}
                  stepper={stepper}
                  onRemove={() => remove(index)}
                />
              );
            case "range":
              return (
                <ComposerRangeRow
                  key={field.id}
                  position={index + 1}
                  count={want.count}
                  ranges={want.ranges}
                  error={
                    form.getFieldState(`wants.${index}.ranges`, formState).error
                      ?.message
                  }
                  rangeErrors={want.ranges.map(
                    (_, range) =>
                      form.getFieldState(
                        `wants.${index}.ranges.${range}`,
                        formState,
                      ).error?.message,
                  )}
                  stepper={stepper}
                  offersNote={index === firstRange}
                  onChange={(ranges) => setWant(index, { ...want, ranges })}
                  onRemove={() => remove(index)}
                />
              );
            case "choice":
              return (
                <ComposerChoiceRow
                  key={field.id}
                  position={index + 1}
                  count={want.count}
                  slugs={want.slugs}
                  collections={display.collections}
                  stepper={stepper}
                  onChange={(slugs) => setWant(index, { ...want, slugs })}
                  onCollection={onCollection}
                  onRemove={() => remove(index)}
                />
              );
          }
        })}

        {searching && (
          <ComposerExactSearch
            onPick={pickCollection}
            onClose={() => setSearching(false)}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!roomForRow}
            aria-expanded={searching}
            onClick={() => setSearching(true)}
            className="border border-dashed border-input max-md:h-10 max-md:flex-1"
          >
            <IconPlus />
            {m.listing_composer_add_exact()}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!roomForRow}
            onClick={() => addRow({ kind: "choice", slugs: [], count: 1 })}
            className="border border-dashed border-input max-md:h-10 max-md:flex-1"
          >
            <IconPlus />
            {m.listing_composer_add_choice()}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!roomForRow}
            onClick={() => addRow({ kind: "range", ranges: [{}], count: 1 })}
            className="border border-dashed border-input max-md:h-10 max-md:flex-1"
          >
            <IconPlus />
            {m.listing_composer_add_range()}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={
              !roomForRow || paymentRow !== -1 || offeredPayment !== undefined
            }
            onClick={() => {
              append({ kind: "payment", amount: "" });
              onPaymentAdded();
            }}
            className="border border-dashed border-amber-500/55 max-md:h-10 max-md:flex-1"
          >
            <IconPlus />
            {m.listing_detail_kind_payment()}
          </Button>
        </div>
        {!roomForRow && (
          <p className="text-xs text-muted-foreground">
            {m.listing_composer_wants_full()}
          </p>
        )}
      </div>

      <FieldError
        errors={[formState.errors.wants?.root, formState.errors.wants]}
      />
    </section>
  );
}
