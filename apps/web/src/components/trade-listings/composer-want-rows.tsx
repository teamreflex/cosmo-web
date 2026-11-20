import { m } from "@/i18n/messages";
import type { ComposerDisplay } from "@/lib/client/trade-listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  ListingFormValues,
  ListingFormWant,
} from "@/lib/universal/trade-listing-form";
import { MAX_LISTING_OPTIONS } from "@apollo/trades/caps";
import {
  addExactWant,
  canAddWant,
  canStep,
  stepCount,
  totalWanted,
} from "@apollo/trades/composer";
import type { ListingInput } from "@apollo/trades/listing";
import { IconPlus } from "@tabler/icons-react";
import { Fragment, useRef, useState } from "react";
import { useFieldArray, type UseFormReturn, useWatch } from "react-hook-form";
import { Button } from "../ui/button";
import { FieldError } from "../ui/field";
import ComposerChoiceRow from "./composer-choice-row";
import ComposerExactRow from "./composer-exact-row";
import ComposerExactSearch from "./composer-exact-search";
import { ComposerPaymentRow } from "./composer-payment";
import ComposerRangeRow from "./composer-range-row";
import ComposerStepper from "./composer-stepper";
import { OrDivider } from "./want-label";

type Props = {
  form: UseFormReturn<ListingFormValues, unknown, ListingInput>;
  display: ComposerDisplay;
  /** the listing's currency, which the payment rows show */
  currency: string;
  onCollection: (collection: Objekt.Collection) => void;
  /** a payment was added, which needs the listing's payment terms */
  onPaymentAdded: () => void;
  /** a payment was removed, which may leave the terms unused */
  onPaymentRemoved: () => void;
  /** an option's claimer amount was typed, which may change the offer mode */
  onPaymentAmount: (option: number, amount: string) => void;
  /** the claimer's payment takes offers, so an empty amount asks for none */
  openToOffers: boolean;
};

/**
 * What the poster asks for in return: one to MAX_LISTING_OPTIONS options,
 * an "or" between them, of which the claimer gives one. "Add option" sits
 * on the heading's line while there is one, so a one-option listing's form
 * keeps its height, and under the options once there are several. An
 * option is removed with its rows. Each option remounts under a new key
 * when one before it goes, so its rows read their new place in the form.
 */
export default function ComposerOptions(props: Props) {
  const { form } = props;
  const { formState } = form;
  const options = useWatch({ control: form.control, name: "options" });
  const [keys, setKeys] = useState(() => options.map((_, index) => index));
  const next = useRef(options.length);
  const canAdd = options.length < MAX_LISTING_OPTIONS;
  const several = options.length > 1;
  const formOptions = {
    shouldDirty: true,
    shouldValidate: formState.isSubmitted,
  };

  function addOption() {
    form.setValue("options", [...form.getValues("options"), []], formOptions);
    setKeys((current) => [...current, next.current++]);
  }

  function removeOption(index: number) {
    const removed = form.getValues("options")[index] ?? [];
    form.setValue(
      "options",
      form.getValues("options").filter((_, option) => option !== index),
      formOptions,
    );
    setKeys((current) => [
      ...current.slice(0, index),
      ...current.slice(index + 1).map(() => next.current++),
    ]);
    if (removed.some((want) => want.kind === "payment")) {
      props.onPaymentRemoved();
    }
  }

  return (
    <section className="flex flex-col gap-3 px-4 py-4 md:px-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xxs font-medium tracking-widest text-amber-700 uppercase dark:text-amber-500">
          {m.listing_composer_looking_for()}
        </span>
        {!several && (
          <button
            type="button"
            onClick={addOption}
            className="flex items-center gap-1 text-xxs font-medium tracking-widest text-muted-foreground uppercase hover:text-foreground"
          >
            <IconPlus className="size-3" />
            {m.listing_composer_add_option()}
          </button>
        )}
      </div>

      {options.map((_, index) => (
        <Fragment key={keys[index] ?? `reset-${index}`}>
          {index > 0 && <OrDivider />}
          <OptionRows
            {...props}
            option={index}
            onRemoveOption={several ? () => removeOption(index) : undefined}
          />
        </Fragment>
      ))}

      {several && canAdd && (
        <Button
          type="button"
          variant="ghost"
          onClick={addOption}
          className="h-11 border border-dashed border-input text-muted-foreground"
        >
          <IconPlus />
          {m.listing_composer_add_option()}
        </Button>
      )}

      <FieldError
        errors={[formState.errors.options?.root, formState.errors.options]}
      />
    </section>
  );
}

/**
 * One option's rows: exact rows for copies of one collection, "any of"
 * rows for any mix of a few named collections, range rows for any objekts
 * matching some values, in the order they're added, and a payment row,
 * kept last, while the poster isn't paying on top of their objekts. With
 * several options, its box is headed with its name and what it asks for,
 * and can be removed.
 */
function OptionRows({
  form,
  display,
  currency,
  onCollection,
  onPaymentAdded,
  onPaymentRemoved,
  onPaymentAmount,
  openToOffers,
  option,
  onRemoveOption,
}: Props & {
  option: number;
  /** removes the option, offered once there are several */
  onRemoveOption: (() => void) | undefined;
}) {
  const { control, formState } = form;
  const { fields, append, insert, remove } = useFieldArray({
    control,
    name: `options.${option}`,
  });
  const [wants, offeredPayment] = useWatch({
    control,
    name: [`options.${option}`, "offeredPayment"],
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
    form.setValue(`options.${option}.${index}`, want, {
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

  const total =
    paymentRow !== -1 && totalWanted(wants) === 0
      ? m.listing_detail_kind_payment()
      : m.listing_composer_trade_total({ count: totalWanted(wants) });

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
      {onRemoveOption === undefined ? (
        <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
          {total}
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-xxs font-medium tracking-widest text-muted-foreground uppercase">
            {`${m.listing_option_label({ number: option + 1 })} · ${total}`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onRemoveOption}
            className="text-muted-foreground"
          >
            {m.listing_composer_remove_option()}
          </Button>
        </div>
      )}

      {fields.map((field, index) => {
        const want = wants[index];
        if (want === undefined) return null;
        if (want.kind === "payment") {
          return (
            <ComposerPaymentRow
              key={field.id}
              currency={currency}
              amount={want.amount ?? ""}
              label={m.listing_composer_payment_amount()}
              placeholder={
                openToOffers ? m.listing_composer_payment_no_price() : undefined
              }
              onChange={(amount) => onPaymentAmount(option, amount)}
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
                  form.getFieldState(
                    `options.${option}.${index}.ranges`,
                    formState,
                  ).error?.message
                }
                rangeErrors={want.ranges.map(
                  (_, range) =>
                    form.getFieldState(
                      `options.${option}.${index}.ranges.${range}`,
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
  );
}
