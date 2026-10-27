import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { m } from "@/i18n/messages";
import { objektQuery } from "@/lib/queries/objekt-queries";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { OfferSerials } from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import { MAX_OFFERED } from "@apollo/trades/caps";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ObjektCardFace } from "../objekt/common";
import SelectableCard from "../trade-listings/selectable-card";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import {
  type OfferCard,
  type OfferPicks,
  type OfferSide,
  offerTones,
} from "./offer-picks";

const columns = {
  give: { arrow: "←", title: m.list_matches_you_have_they_want },
  get: { arrow: "→", title: m.list_matches_they_have_you_want },
} as const;

type OfferColumnsProps = {
  give: readonly string[];
  get: readonly string[];
  collections: Record<string, Objekt.Collection>;
  /** the first row's images load first */
  priority: boolean;
  /** how the cards are picked; without it they only open their collection */
  selection: OfferSelection | null;
};

export type OfferSelection = {
  /** the copy behind each card, by collection */
  serials: OfferSerials;
  picks: OfferPicks;
  onToggle: (side: OfferSide, card: OfferCard) => void;
};

/**
 * What one side gives and the other gets, as two columns of cards: the
 * viewer's, then the other party's. With a selection, tapping a card adds
 * its copy to the offer or takes it out. A collection's cards share one copy
 * and one pick, so a collection shown twice is never offered twice.
 */
export function OfferColumns(props: OfferColumnsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <OfferColumn side="give" {...props} />
      <OfferColumn side="get" {...props} />
    </div>
  );
}

function OfferColumn({
  side,
  collections,
  priority,
  selection,
  ...sides
}: OfferColumnsProps & { side: OfferSide }) {
  const column = columns[side];
  const tone = offerTones[side];
  const slugs = sides[side];
  const picked: ReadonlyMap<string, OfferCard> =
    selection?.picks[side] ?? new Map();
  const anyPicked = slugs.some((slug) => picked.has(slug));

  return (
    <div
      className={cn("flex flex-col gap-2 border-l-2 pl-2 sm:pl-3", tone.border)}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-xxs font-semibold tracking-wider uppercase",
          tone.text,
        )}
      >
        <span>{column.arrow}</span>
        <span className="flex-1 truncate">{column.title()}</span>
        <span className="font-mono text-muted-foreground tabular-nums">
          {slugs.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:gap-2">
        {slugs.map((slug, index) => {
          const collection = collections[slug];
          if (collection === undefined) {
            return (
              <span
                key={slug}
                className="grid aspect-photocard place-items-center rounded-md bg-muted p-1 text-center font-mono text-xxs break-all text-muted-foreground"
              >
                {slug}
              </span>
            );
          }
          // a first row is three cards on phones and up to six wider
          const first = priority && index < 6;
          if (selection === null) {
            return (
              <CollectionCard
                key={slug}
                collection={collection}
                priority={first}
              />
            );
          }
          const pick =
            picked.get(slug) ?? selection.serials[side][slug] ?? null;
          return (
            <SelectableCard
              key={slug}
              collection={collection}
              serial={pick?.serial}
              picked={picked.has(slug)}
              blocked={pick === null ? m.list_matches_card_unavailable() : null}
              full={picked.size >= MAX_OFFERED}
              faded={anyPicked}
              priority={first}
              onToggle={() => {
                if (pick !== null) {
                  selection.onToggle(side, {
                    tokenId: pick.tokenId,
                    serial: pick.serial,
                    slug,
                    collection,
                  });
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * A card that can't be picked, which opens its collection's details.
 */
function CollectionCard({
  collection,
  priority,
}: {
  collection: Objekt.Collection;
  priority: boolean;
}) {
  const queryClient = useQueryClient();
  const { open } = useMetadataDialog();

  return (
    <div className="@container">
      <button
        type="button"
        aria-label={`${collection.member} ${collection.collectionNo}`}
        onClick={() => {
          queryClient.setQueryData(
            objektQuery(collection.slug).queryKey,
            collection,
          );
          open(collection.slug);
        }}
        style={{ "--objekt-background-color": collection.backgroundColor }}
        className="relative block aspect-photocard w-full cursor-pointer overflow-hidden rounded-photocard bg-secondary outline-2 -outline-offset-2 outline-transparent transition-[outline-color] duration-150 hover:outline-(--objekt-background-color) focus-visible:outline-offset-2 focus-visible:outline-cosmo"
      >
        <ObjektCardFace collection={collection} priority={priority} />
      </button>
    </div>
  );
}

type OfferBarProps = {
  /** above the counts, naming who the offer goes to */
  eyebrow?: ReactNode;
  give: number;
  get: number;
  help: string;
  /** the bar's buttons, the primary one last */
  children: ReactNode;
};

/**
 * The bar pinned under an offer's cards: how many copies each side gives,
 * a line on how picking works, or that a side is full, and the buttons that
 * act on it. Phones stack the three, tablets put the counts and buttons on
 * one row over the line, and desktops fit everything on one row. On phones
 * the buttons are 44px tall and the primary one stretches, which the
 * callers' buttons set.
 */
export function OfferBar({
  eyebrow,
  give,
  get,
  help,
  children,
}: OfferBarProps) {
  return (
    <div className="flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-x-4 lg:flex-nowrap">
      <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        {eyebrow !== undefined && (
          <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
            {eyebrow}
          </span>
        )}
        <span className="text-sm font-medium tabular-nums">
          <ParaglideMessage
            message={m.list_matches_offer_counts}
            inputs={{ give, get }}
            markup={{
              give: ({ children }) => (
                <span className={offerTones.give.text}>{children}</span>
              ),
              get: ({ children }) => (
                <span className={offerTones.get.text}>{children}</span>
              ),
            }}
          />
        </span>
      </div>
      {/* a full side's greyed cards say why here, read out as it fills */}
      <p
        aria-live="polite"
        className="text-xs text-muted-foreground md:order-last md:basis-full lg:order-none lg:min-w-0 lg:flex-1"
      >
        {give >= MAX_OFFERED || get >= MAX_OFFERED
          ? m.list_matches_offer_full({ count: MAX_OFFERED })
          : help}
      </p>
      <div className="flex shrink-0 gap-2 md:ml-auto">{children}</div>
    </div>
  );
}

// an offer's cards while the copies behind them load
export function OfferColumnsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        // the photocard radius is sized against a container
        <div key={i} className="@container">
          <Skeleton className="aspect-photocard w-full rounded-photocard" />
        </div>
      ))}
    </div>
  );
}

// the copies behind an offer's cards failed to load
export function OfferColumnsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-muted-foreground">
        {m.list_matches_serials_error()}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <IconRefresh /> {m.common_retry()}
      </Button>
    </div>
  );
}
