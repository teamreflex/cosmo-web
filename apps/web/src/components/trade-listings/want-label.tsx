import { m } from "@/i18n/messages";
import {
  askingPriceText,
  formatAmount,
  joinOptions,
  objektName,
  optionTitle,
  optionTitles,
  paymentMethodsText,
  wantedObjektCount,
  wantKindsSummary,
  wantLabel,
} from "@/lib/client/trade-listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  ListingFeedWant,
  ListingOption,
  WantsHeading,
} from "@/lib/universal/trade-listings";
import type { ListingPayment } from "@apollo/trades/payment";
import type { ObjektAttributes } from "@apollo/trades/range";
import { Fragment, type ReactNode } from "react";
import { ObjektCount, ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Badge } from "../ui/badge";
import { RangeBadges } from "./range-want";
import SideHeading from "./side-heading";

type Props = {
  want: ListingFeedWant;
};

/**
 * A want row's count and what it asks for, as the listing page heads an
 * exact row ("1× Atom01 KimLip 207A") or an "any of" row ("2× Any of 4
 * collections"). It flows as one line of text, so a long label wraps after
 * the count instead of leaving the count alone.
 */
export default function WantLabel({ want }: Props) {
  return (
    <span className="min-w-0 leading-relaxed break-words">
      <WantCount count={want.count} />
      <span dir="auto" className="font-semibold">
        {wantLabel(want)}
      </span>
    </span>
  );
}

/**
 * A listing's payment behind its badge, in its own currency: what one
 * trade pays (one unit's, on a buy listing), or with `units` what this many
 * units pay in all, and whether
 * it takes offers, over the methods it may arrive by. A payment with no
 * asking price reads "Make an offer".
 */
export function PaymentLabel({
  payment,
  units = 1,
  perUnit = false,
}: {
  payment: ListingPayment;
  units?: number;
  /** a buy listing's price, which is for each unit rather than each trade */
  perUnit?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-1 leading-relaxed">
      <span>
        <Badge variant="outline" className="me-2 align-middle">
          {m.listing_detail_kind_payment()}
        </Badge>
        {payment.amount === null ? (
          <span className="font-semibold">
            {m.listing_payment_offer_only()}
          </span>
        ) : (
          <>
            <span className="font-mono font-semibold tabular-nums">
              {formatAmount(payment.amount * units, payment.currency)}
            </span>
            <span className="ms-1.5 text-muted-foreground">
              {units === 1
                ? perUnit
                  ? m.listing_payment_each_unit()
                  : m.listing_detail_payment_each()
                : m.listing_detail_payment_units({
                    amount: formatAmount(payment.amount, payment.currency),
                    count: units,
                  })}
              {payment.mode === "price_or_offer" &&
                ` · ${m.listing_payment_open_to_offers_tag()}`}
            </span>
          </>
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        {(payment.side === "to"
          ? m.listing_detail_payment_methods
          : m.listing_detail_payment_methods_pays)({
          methods: paymentMethodsText(payment.methods),
        })}
      </span>
    </span>
  );
}

function WantCount({ count }: { count: number }) {
  return (
    <span className="me-2 font-mono font-bold text-amber-700 tabular-nums dark:text-amber-500">
      {count}×
    </span>
  );
}

/**
 * Every row the listing asks for, for viewers who aren't picking from their
 * own objekts: "Looking for" in the want colour, or "You're looking for"
 * for the poster. The heading counts one trade's worth, and the summary
 * sums the rows up unless the page says otherwise. A listing with several
 * options heads how many it has over each option in its own box, an "or"
 * between them, since the claimer gives one. Any note the page adds goes
 * under them.
 */
export function WantList({
  options,
  heading = "looking_for",
  summary,
  children,
}: {
  options: ListingOption<ListingFeedWant>[];
  heading?: WantsHeading;
  summary?: string;
  children?: ReactNode;
}) {
  const [only, ...others] = options;
  const title =
    heading === "you_look_for"
      ? m.listing_detail_you_look_for
      : m.listing_detail_looking_for;
  if (only !== undefined && others.length === 0) {
    const paid = only.payment?.side === "to" ? only.payment : null;
    return (
      <section className="flex min-w-0 flex-col gap-4">
        <SideHeading
          tone="want"
          title={title({
            // a sale asks for its price alone
            count:
              only.wants.length === 0 && paid !== null
                ? askingPriceText(paid)
                : wantedObjektCount(only.wants),
          })}
          summary={summary ?? wantKindsSummary(only.wants, only.payment)}
        />
        <WantRows wants={only.wants} payment={paid} />
        {children}
      </section>
    );
  }
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SideHeading
        tone="want"
        title={title({
          count: m.listing_options_count({ count: options.length }),
        })}
        summary={summary ?? joinOptions(optionTitles(options))}
      />
      {options.map((option, index) => (
        <Fragment key={index}>
          {index > 0 && <OrDivider />}
          <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <OptionHeading number={index + 1} option={option} />
            <WantRows
              wants={option.wants}
              payment={option.payment?.side === "to" ? option.payment : null}
            />
          </div>
        </Fragment>
      ))}
      {children}
    </section>
  );
}

/**
 * An option's name and what it asks for, "Option 2 · $3.00", over its
 * rows.
 */
export function OptionHeading({
  number,
  option,
}: {
  number: number;
  option: ListingOption<ListingFeedWant>;
}) {
  return (
    <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
      {`${m.listing_option_label({ number })} · ${optionTitle(option)}`}
    </span>
  );
}

/**
 * The rule between two options, with "or" on it: the claimer gives one.
 */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xxs font-bold tracking-widest text-amber-700 uppercase dark:text-amber-500">
        {m.listing_option_or()}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * One option's rows: ranges and the payment the claimer sends as rows in a
 * panel, and exact and "any of" rows below them as objekt cards, an "any
 * of" row's under its count.
 */
function WantRows({
  wants,
  payment,
}: {
  wants: ListingFeedWant[];
  payment: ListingPayment | null;
}) {
  const ranges = wants.flatMap((want) => (want.kind === "range" ? [want] : []));
  const exact = wants.flatMap((want) => (want.kind === "exact" ? [want] : []));
  const choices = wants.flatMap((want) =>
    want.kind === "choice" ? [want] : [],
  );

  return (
    <>
      {ranges.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border bg-card text-sm">
          {ranges.map((want, index) => (
            <li key={index} className="px-4 py-3">
              <RangeBadges count={want.count} ranges={want.ranges} />
            </li>
          ))}
        </ul>
      )}
      {exact.length > 0 && (
        <CardGrid>
          {exact.map((want, index) => (
            <li key={index} className="flex min-w-0 flex-col gap-2">
              <CollectionCard
                collection={want.collection}
                attributes={want.objekt}
                count={want.count}
              />
            </li>
          ))}
        </CardGrid>
      )}
      {choices.map((want, index) => (
        <div key={index} className="flex min-w-0 flex-col gap-2.5">
          <span className="text-sm">
            <WantCount count={want.count} />
            <span className="font-semibold">{wantLabel(want)}</span>
          </span>
          <CardGrid>
            {want.options.map((option) => (
              <li key={option.slug} className="flex min-w-0 flex-col gap-2">
                <CollectionCard
                  collection={option.collection}
                  attributes={option}
                />
              </li>
            ))}
          </CardGrid>
        </div>
      ))}
      {/* the payment comes last, as the composer keeps it */}
      {payment !== null && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <PaymentLabel payment={payment} />
        </div>
      )}
    </>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,180px)] sm:gap-4">
      {children}
    </ul>
  );
}

/**
 * A collection a row asks for as an objekt card, with an exact row's count
 * on the card when it asks for more than one and under the name. An "any
 * of" row's collections carry no count of their own.
 */
function CollectionCard({
  collection,
  attributes,
  count,
}: {
  collection: Objekt.Collection | null;
  attributes: ObjektAttributes;
  count?: number;
}) {
  return (
    <>
      {collection === null ? (
        <div className="@container">
          <div className="aspect-photocard rounded-photocard bg-muted" />
        </div>
      ) : (
        <ExpandableObjekt collection={collection}>
          <ObjektSidebar collection={collection} />
          {count !== undefined && <ObjektCount count={count} />}
        </ExpandableObjekt>
      )}
      <span className="flex min-w-0 flex-col gap-0.5 text-sm">
        <span dir="auto" className="font-semibold break-words">
          {objektName(collection, attributes)}
        </span>
        {count !== undefined && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            ×{count}
          </span>
        )}
      </span>
    </>
  );
}
