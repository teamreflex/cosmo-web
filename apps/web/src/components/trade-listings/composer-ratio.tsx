import { m } from "@/i18n/messages";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { type ReactNode, useId } from "react";
import ComposerStepper from "./composer-stepper";

type Props = {
  /** how many of the offered objekts one trade takes */
  unitSize: number;
  /** whether it takes the whole pool however the pool changes */
  bundle: boolean;
  offered: number;
  /**
   * the want side: objekts or a price beside them, or a price alone (a sale), with what the want rows and the claimer's payment ask for in total, "2 + $3.00"; or `offers`: no asking price, or several options, which shows no want side
   */
  want: { kind: "offers" } | { kind: "objekts" | "price"; text: string };
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
 * than the pool now holds says so instead, and only steps down. With
 * several options, the want side reads them joined by "or". A listing
 * with no asking price shows only the poster's side.
 */
export default function ComposerRatio({
  unitSize,
  bundle,
  offered,
  want,
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
          {want.kind !== "offers" && (
            <>
              <span
                aria-hidden
                className="font-mono text-2xl text-muted-foreground"
              >
                :
              </span>
              <span className="min-w-9 text-center font-mono text-2xl font-bold text-amber-700 tabular-nums dark:text-amber-500">
                {want.text}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1 text-sm leading-relaxed">
        <p>
          {want.kind === "offers" ? (
            <ParaglideMessage
              message={m.listing_composer_ratio_each_offer}
              inputs={{ give: unitSize }}
              markup={{ b: Bold }}
            />
          ) : (
            <ParaglideMessage
              message={
                want.kind === "price"
                  ? m.listing_composer_ratio_each_price
                  : m.listing_composer_ratio_each
              }
              inputs={{ give: unitSize, get: want.text }}
              markup={{ b: Bold }}
            />
          )}
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
                : want.kind === "offers"
                  ? m.listing_composer_ratio_times_offer({
                      count: Math.floor(offered / unitSize),
                      offered,
                    })
                  : m.listing_composer_ratio_times({
                      count: Math.floor(offered / unitSize),
                      offered,
                      wanted: want.text,
                    })}
          </p>
        )}
      </div>
    </section>
  );
}

function Bold({ children }: { children?: ReactNode }) {
  return (
    <strong className="font-mono font-bold tabular-nums">{children}</strong>
  );
}
