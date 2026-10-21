import { m } from "@/i18n/messages";
import { listMatchesQuery } from "@/lib/queries/objekt-queries";
import { offerSerialsQuery } from "@/lib/queries/trades";
import type { TradePartner } from "@/lib/universal/lists";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { MAX_OFFER_SERIAL_SLUGS } from "@/lib/universal/schema/trades";
import { cn } from "@/lib/utils";
import {
  IconArrowsExchange,
  IconArrowUpRight,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import UserAvatar from "../profile/user-avatar";
import {
  OfferColumns,
  OfferColumnsSkeleton,
  type OfferSelection,
} from "../trades/offer-picker";
import {
  type OfferPicks,
  type OfferSide,
  offerTones,
} from "../trades/offer-picks";
import { Skeleton } from "../ui/skeleton";

type Props = {
  id: string;
  name: string;
  /** the partner whose matches are open, and the copies picked from them */
  offer: ({ partner: TradePartner } & OfferPicks) | null;
  onExpand: (partner: TradePartner) => void;
  /**
   * null when the viewer can't make offers, which leaves the cards
   * unpickable, as they are for a partner who can't receive one
   */
  onToggle: OfferSelection["onToggle"] | null;
};

export default function ListMatchesContent({
  id,
  name,
  offer,
  onExpand,
  onToggle,
}: Props) {
  const { data } = useSuspenseQuery(listMatchesQuery(id));

  if (data.partners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{m.list_matches_empty()}</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border overflow-clip rounded-md border">
      {data.partners.map((partner, index) => {
        // only the open partner has picks
        const picks = offer?.partner.userId === partner.userId ? offer : null;
        return (
          <PartnerRow
            key={partner.userId}
            partner={partner}
            rank={index + 1}
            expanded={picks !== null}
            onExpand={() => onExpand(partner)}
          >
            {picks !== null &&
              (onToggle === null || !partner.offerable ? (
                <PartnerMatches
                  listName={name}
                  partner={partner}
                  collections={data.collections}
                  selection={null}
                />
              ) : (
                <QueryErrorResetBoundary>
                  {({ reset }) => (
                    <ErrorBoundary
                      onReset={reset}
                      fallbackRender={() => (
                        <p className="text-sm text-muted-foreground">
                          {m.list_matches_serials_error()}
                        </p>
                      )}
                    >
                      <Suspense fallback={<OfferColumnsSkeleton />}>
                        <PartnerOffer
                          listName={name}
                          partner={partner}
                          collections={data.collections}
                          picks={picks}
                          onToggle={onToggle}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  )}
                </QueryErrorResetBoundary>
              ))}
          </PartnerRow>
        );
      })}
    </ul>
  );
}

type PartnerRowProps = {
  partner: TradePartner;
  rank: number;
  expanded: boolean;
  onExpand: () => void;
  /** the partner's matches, shown while expanded */
  children: ReactNode;
};

function PartnerRow({
  partner,
  rank,
  expanded,
  onExpand,
  children,
}: PartnerRowProps) {
  const overlapHave = new Set(
    partner.matches.flatMap((match) => match.theyHaveIWant),
  ).size;
  const overlapWant = new Set(
    partner.matches.flatMap((match) => match.iHaveTheyWant),
  ).size;

  return (
    <li className={cn(expanded && "bg-muted/40")}>
      <button
        type="button"
        onClick={onExpand}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60"
      >
        <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {String(rank).padStart(2, "0")}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-x-3 gap-y-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <UserAvatar
              variant="square"
              username={partner.username}
              className="size-7 sm:size-9"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {partner.username}
            </span>
          </div>
          <MatchSignature have={overlapHave} want={overlapWant} />
        </div>
        <IconChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-5 border-t border-border px-2 py-3 sm:px-3">
          {children}
        </div>
      )}
    </li>
  );
}

type PartnerMatchesProps = {
  listName: string;
  partner: TradePartner;
  collections: Record<string, Objekt.Collection>;
};

/**
 * The copies behind the partner's cards, read once for all of their lists,
 * so the viewer can pick them into an offer.
 */
function PartnerOffer({
  picks,
  onToggle,
  ...props
}: PartnerMatchesProps & Omit<OfferSelection, "serials">) {
  // a list has no cap, so past the request's cap a collection shows as unavailable
  const give = [
    ...new Set(props.partner.matches.flatMap((match) => match.iHaveTheyWant)),
  ].slice(0, MAX_OFFER_SERIAL_SLUGS);
  const get = [
    ...new Set(props.partner.matches.flatMap((match) => match.theyHaveIWant)),
  ].slice(0, MAX_OFFER_SERIAL_SLUGS);
  const { data: serials } = useSuspenseQuery(
    offerSerialsQuery(props.partner.userId, give, get),
  );

  return <PartnerMatches {...props} selection={{ serials, picks, onToggle }} />;
}

/**
 * Each of the partner's matching lists, with what each side would give.
 */
function PartnerMatches({
  listName,
  partner,
  collections,
  selection,
}: PartnerMatchesProps & { selection: OfferSelection | null }) {
  return partner.matches.map((match, index) => (
    <div key={match.listId} className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span>{listName}</span>

        <Link
          to="/@{$username}/list/$slug"
          params={{
            username: partner.username,
            slug: match.listSlug,
          }}
          className="flex items-center justify-end gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>{match.listName}</span>
          <IconArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <OfferColumns
        give={match.iHaveTheyWant}
        get={match.theyHaveIWant}
        collections={collections}
        priority={index === 0}
        selection={selection}
      />
    </div>
  ));
}

type MatchSignatureProps = {
  have: number;
  want: number;
};

function MatchSignature({ have, want }: MatchSignatureProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs">
      <MatchChip value={have} label={m.list_matches_have_label()} tone="get" />
      <IconArrowsExchange className="size-3.5 text-muted-foreground" />
      <MatchChip value={want} label={m.list_matches_want_label()} tone="give" />
    </div>
  );
}

function MatchChip({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  /** what they have is what you'd get, what they want is what you'd give */
  tone: OfferSide;
}) {
  const c = offerTones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5",
        c.border,
        c.bg,
        c.text,
      )}
    >
      <span className="font-mono font-semibold tabular-nums">{value}</span>
      <span className="text-xxs tracking-wider uppercase">{label}</span>
    </span>
  );
}

export function ListMatchesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
