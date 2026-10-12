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
import { type UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "../ui/button";
import { FieldError } from "../ui/field";
import ComposerExactRow from "./composer-exact-row";
import ComposerExactSearch from "./composer-exact-search";
import ComposerRangeRow from "./composer-range-row";
import ComposerStepper from "./composer-stepper";

type Props = {
  form: UseFormReturn<ListingFormValues, unknown, ListingInput>;
  display: ComposerDisplay;
  onCollection: (collection: Objekt.Collection) => void;
};

/**
 * What the poster asks for in return: exact rows for copies of one
 * collection and range rows for any objekts matching some values, in the
 * order they're added.
 */
export default function ComposerWantRows({
  form,
  display,
  onCollection,
}: Props) {
  const { control, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "wants",
  });
  const wants = useWatch({ control, name: "wants" });
  const [searching, setSearching] = useState(false);
  const roomForRow = canAddWant(wants);
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
      if (added.index === fields.length) append(want);
      else setWant(added.index, want);
    }
    setSearching(false);
  }

  return (
    <section className="flex flex-col gap-3 px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="text-xxs font-medium tracking-widest text-amber-700 uppercase dark:text-amber-500">
          {m.listing_composer_looking_for()}
        </span>
        <span className="text-xs text-muted-foreground">
          {m.listing_composer_looking_for_help()}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
        <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
          {m.listing_composer_trade_total({ count: totalWanted(wants) })}
        </span>

        {fields.map((field, index) => {
          const want = wants[index];
          if (want === undefined) return null;
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

          return want.kind === "exact" ? (
            <ComposerExactRow
              key={field.id}
              position={index + 1}
              count={want.count}
              slug={want.slug}
              shown={display.collections.get(want.slug)}
              stepper={stepper}
              onRemove={() => remove(index)}
            />
          ) : (
            <ComposerRangeRow
              key={field.id}
              position={index + 1}
              count={want.count}
              filter={want.filter}
              error={
                form.getFieldState(`wants.${index}.filter`, formState).error
                  ?.message
              }
              stepper={stepper}
              onChange={(filter) => setWant(index, { ...want, filter })}
              onRemove={() => remove(index)}
            />
          );
        })}

        {searching && (
          <ComposerExactSearch
            onPick={pickCollection}
            onClose={() => setSearching(false)}
          />
        )}

        <div className="flex gap-2">
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
            onClick={() => append({ kind: "range", filter: {}, count: 1 })}
            className="border border-dashed border-input max-md:h-10 max-md:flex-1"
          >
            <IconPlus />
            {m.listing_composer_add_range()}
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
