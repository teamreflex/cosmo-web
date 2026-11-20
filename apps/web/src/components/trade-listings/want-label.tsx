import { m } from "@/i18n/messages";
import {
  askingPriceText,
  formatAmount,
  objektName,
  paymentMethodsText,
  wantedObjektCount,
  wantKindsSummary,
  wantLabel,
} from "@/lib/client/trade-listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  ListingFeedWant,
  WantsHeading,
} from "@/lib/universal/trade-listings";
import type { ListingPayment } from "@apollo/trades/payment";
import type { ObjektAttributes } from "@apollo/trades/range";
import type { ReactNode } from "react";
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
 * trade pays, or with `units` what this many units pay in all, and whether
 * it takes offers, over the methods it may arrive by. A payment with no
 * asking price reads "Make an offer".
 */
export function PaymentLabel({
  payment,
  units = 1,
}: {
  payment: ListingPayment;
  units?: number;
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
                ? m.listing_detail_payment_each()
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
 * sums the rows up unless the page says otherwise. Ranges and the payment
 * the claimer sends read as rows in a panel, and exact and "any of" rows
 * below them as objekt cards, an "any of" row's under its count, with any
 * note the page adds under them.
 */
export function WantList({
  wants,
  payment,
  heading = "looking_for",
  summary = wantKindsSummary(wants, payment),
  children,
}: {
  wants: ListingFeedWant[];
  payment: ListingPayment | null;
  heading?: WantsHeading;
  summary?: string;
  children?: ReactNode;
}) {
  const ranges = wants.flatMap((want) => (want.kind === "range" ? [want] : []));
  const paid = payment?.side === "to" ? payment : null;
  const exact = wants.flatMap((want) => (want.kind === "exact" ? [want] : []));
  const choices = wants.flatMap((want) =>
    want.kind === "choice" ? [want] : [],
  );

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SideHeading
        tone="want"
        title={(heading === "you_look_for"
          ? m.listing_detail_you_look_for
          : m.listing_detail_looking_for)({
          // a sale asks for its price alone
          count:
            wants.length === 0 && paid !== null
              ? askingPriceText(paid)
              : wantedObjektCount(wants),
        })}
        summary={summary}
      />
      {(ranges.length > 0 || paid !== null) && (
        <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border bg-card text-sm">
          {ranges.map((want, index) => (
            <li key={index} className="px-4 py-3">
              <RangeBadges count={want.count} ranges={want.ranges} />
            </li>
          ))}
          {paid !== null && (
            <li className="px-4 py-3">
              <PaymentLabel payment={paid} />
            </li>
          )}
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
      {children}
    </section>
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
