import { m } from "@/i18n/messages";
import { MAX_BUY_UNITS } from "@apollo/trades/caps";
import { useId } from "react";
import ComposerStepper from "./composer-stepper";

/**
 * How many units a buy listing pays for, from one to MAX_BUY_UNITS, in the
 * Ratio control's place, since a listing that offers no objekts has no
 * ratio.
 */
export default function ComposerBuyUnits({
  maxUnits,
  onChange,
}: {
  maxUnits: number;
  onChange: (maxUnits: number) => void;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-cosmo/30 bg-cosmo/5 px-4 py-4 md:px-5"
    >
      <div className="flex shrink-0 flex-col gap-1">
        <span
          id={titleId}
          className="text-xxs font-medium tracking-widest text-cosmo uppercase dark:text-cosmo-text"
        >
          {m.listing_composer_buy_units()}
        </span>
        <ComposerStepper
          size="lg"
          value={maxUnits}
          canDecrement={maxUnits > 1}
          canIncrement={maxUnits < MAX_BUY_UNITS}
          labels={{
            group: m.listing_composer_buy_units(),
            fewer: m.listing_composer_buy_units_fewer(),
            more: m.listing_composer_buy_units_more(),
          }}
          valueClassName="text-teal-700 dark:text-teal-500"
          onStep={(delta) => onChange(maxUnits + delta)}
        />
      </div>
    </section>
  );
}
