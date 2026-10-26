import { m } from "@/i18n/messages";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { useId } from "react";
import ComposerStepper from "./composer-stepper";

type Props = {
  /** how many of the offered objekts one trade takes */
  unitSize: number;
  /** whether it takes the whole pool however the pool changes */
  bundle: boolean;
  offered: number;
  /** what the want rows ask for in total */
  wanted: number;
  onChange: (unitSize: number) => void;
};

/**
 * How many of the poster's objekts one trade takes against what the want
 * rows ask for, "1 : 2". The poster steps their side between one and every
 * objekt offered, and the other side follows the rows. Stepping up to the
 * whole pool makes it a bundle, which takes all of it as the pool changes;
 * a ratio held at the pool's size by removed objekts steps once more to
 * become one. Below it, what that lets people do: trade a few at a time,
 * choosing which, or everything in one go. An edit whose ratio takes more
 * than the pool now holds says so instead, and only steps down.
 */
export default function ComposerRatio({
  unitSize,
  bundle,
  offered,
  wanted,
  onChange,
}: Props) {
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
          {m.listing_composer_ratio()}
        </span>
        <div className="flex items-center gap-2.5">
          <ComposerStepper
            size="lg"
            value={unitSize}
            canDecrement={unitSize > 1}
            canIncrement={!bundle && unitSize <= offered}
            labels={{
              group: m.listing_composer_ratio_label(),
              fewer: m.listing_composer_ratio_fewer(),
              more: m.listing_composer_ratio_more(),
            }}
            valueClassName="text-teal-700 dark:text-teal-500"
            onStep={(delta) => onChange(unitSize + delta)}
          />
          <span
            aria-hidden
            className="font-mono text-2xl text-muted-foreground"
          >
            :
          </span>
          <span className="min-w-9 text-center font-mono text-2xl font-bold text-amber-700 tabular-nums dark:text-amber-500">
            {wanted}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1 text-sm leading-relaxed">
        <p>
          <ParaglideMessage
            message={m.listing_composer_ratio_each}
            inputs={{ give: unitSize, get: wanted }}
            markup={{
              b: ({ children }) => (
                <strong className="font-mono font-bold tabular-nums">
                  {children}
                </strong>
              ),
            }}
          />
        </p>
        {unitSize > offered ? (
          <p className="text-amber-700 dark:text-amber-500">
            {m.listing_composer_reason_ratio({ unitSize, offered })}
          </p>
        ) : (
          <p className="text-muted-foreground">
            {bundle
              ? m.listing_composer_ratio_bundle({ offered })
              : unitSize === offered
                ? m.listing_composer_ratio_held({ offered })
                : m.listing_composer_ratio_times({
                    count: Math.floor(offered / unitSize),
                    offered,
                    wanted,
                  })}
          </p>
        )}
      </div>
    </section>
  );
}
