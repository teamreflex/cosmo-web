import { m } from "@/i18n/messages";
import {
  objektName,
  wantKindsSummary,
  wantLabel,
  wantedObjektCount,
} from "@/lib/client/trade-listings";
import type {
  ListingFeedWant,
  WantsHeading,
} from "@/lib/universal/trade-listings";
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
 * exact row ("1× Atom01 KimLip 207A"), or a payment row behind its badge.
 * It flows as one line of text, so a long label wraps after the count
 * instead of leaving the count alone.
 */
export default function WantLabel({ want }: Props) {
  return (
    <span className="min-w-0 leading-relaxed break-words">
      {want.kind === "payment" ? (
        <Badge variant="outline" className="me-2 align-middle">
          {m.listing_detail_kind_payment()}
        </Badge>
      ) : (
        <span className="me-2 font-mono font-bold text-amber-700 tabular-nums dark:text-amber-500">
          {want.count}×
        </span>
      )}
      <span
        dir="auto"
        className={
          want.kind === "payment"
            ? "font-mono font-semibold tabular-nums"
            : "font-semibold"
        }
      >
        {wantLabel(want)}
      </span>
    </span>
  );
}

/**
 * Every row the listing asks for, for viewers who aren't picking from their
 * own objekts: "Looking for" in the want colour, or "You give" in the have
 * colour for the claimer, who is giving it. Ranges read as rows of badges
 * in a panel, and exact rows below them as objekt cards.
 */
export function WantList({
  wants,
  heading = "looking_for",
}: {
  wants: ListingFeedWant[];
  heading?: WantsHeading;
}) {
  const count = wantedObjektCount(wants);
  const rows = wants.filter((want) => want.kind !== "exact");
  const exact = wants.flatMap((want) => (want.kind === "exact" ? [want] : []));

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <SideHeading
        tone={heading === "you_give" ? "have" : "want"}
        title={
          heading === "you_give"
            ? m.listing_detail_you_give_total({ count })
            : m.listing_detail_looking_for({ count })
        }
        summary={wantKindsSummary(wants)}
      />
      {rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border bg-card text-sm">
          {rows.map((want, index) => (
            <li key={index} className="px-4 py-3">
              {want.kind === "range" ? (
                <RangeBadges count={want.count} filter={want.filter} />
              ) : (
                <WantLabel want={want} />
              )}
            </li>
          ))}
        </ul>
      )}
      {exact.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,180px)] sm:gap-4">
          {exact.map((want, index) => (
            <li key={index} className="flex min-w-0 flex-col gap-2">
              <ExactCard want={want} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * An exact row as an objekt card, with its count on the card when it asks
 * for more than one and under the name.
 */
function ExactCard({
  want,
}: {
  want: Extract<ListingFeedWant, { kind: "exact" }>;
}) {
  return (
    <>
      {want.collection === null ? (
        <div className="@container">
          <div className="aspect-photocard rounded-photocard bg-muted" />
        </div>
      ) : (
        <ExpandableObjekt collection={want.collection}>
          <ObjektSidebar collection={want.collection} />
          <ObjektCount count={want.count} />
        </ExpandableObjekt>
      )}
      <span className="flex min-w-0 flex-col gap-0.5 text-sm">
        <span dir="auto" className="font-semibold break-words">
          {objektName(want.collection, want.objekt)}
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          ×{want.count}
        </span>
      </span>
    </>
  );
}
