import ObjektPanel from "@/components/objekt/detail/objekt-panel";
import SortButton, {
  type SortDir,
} from "@/components/objekt/detail/sort-button";
import { ApproxPrice } from "@/components/objekt/price-display";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { collectionListingsQuery } from "@/lib/queries/listings";
import { objektPriceHistoryQuery } from "@/lib/queries/objekt-queries";
import {
  type CollectionListing,
  type ListingStats,
  listingStats,
} from "@/lib/universal/listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconLoader2 } from "@tabler/icons-react";
import { usePrefetchQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Suspense, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useIsomorphicLayoutEffect } from "usehooks-ts";
import ListingRow from "./listing-row";
import { FloorChange, FloorTrend, ListingsStatsStrip } from "./listings-stats";

const sortKeys = ["price", "serial", "listed"] as const;
type SortKey = (typeof sortKeys)[number];

const sortLabels = {
  price: m.list_sale_price,
  serial: m.detail_sort_serial,
  listed: m.listings_listed,
} satisfies Record<SortKey, () => string>;

type Props = {
  collection: Objekt.Collection;
  pinnedEntryId?: string;
};

/**
 * How much room the listings have: a phone drawer, a desktop column too
 * narrow for the full rows, or one wide enough for them.
 */
type Layout = "phone" | "narrow" | "wide";

/**
 * Below this column width the full rows' cells no longer fit.
 */
const WIDE_LISTINGS = 800;

/**
 * Desktop puts the full objekt beside the listings; phones get a thumbnail
 * header above them instead.
 */
export default function ListingsContent({ collection, pinnedEntryId }: Props) {
  const isDesktop = useMediaQuery();
  const { ref: columnRef, wide } = useWideColumn();
  usePrefetchQuery(objektPriceHistoryQuery(collection.slug, "30d"));
  const layout: Layout = !isDesktop ? "phone" : wide ? "wide" : "narrow";

  const listings = (
    <ErrorBoundary fallback={<Message>{m.error_loading_objekt()}</Message>}>
      <Suspense
        fallback={
          <div className="flex flex-col">
            {!isDesktop && <PhoneHeader collection={collection} />}
            <div className="flex justify-center py-8">
              <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        }
      >
        <Listings
          collection={collection}
          pinnedEntryId={pinnedEntryId}
          layout={layout}
        />
      </Suspense>
    </ErrorBoundary>
  );

  if (!isDesktop) {
    return <div className="flex min-h-0 flex-1 flex-col">{listings}</div>;
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[calc(var(--objekt-width)+6rem)_1fr] overflow-hidden [--objekt-width:min(280px,calc(50dvh*(var(--aspect-photocard))))]">
      <ObjektPanel collection={collection} isDesktop />
      {/* the panel alone sets the height, so long lists scroll instead of growing the dialog */}
      <div ref={columnRef} className="flex min-h-0 flex-col contain-size">
        {listings}
      </div>
    </div>
  );
}

/**
 * Whether the listings column fits the full rows. Reads the layout width
 * rather than the on-screen box, which the dialog's opening zoom shrinks.
 */
function useWideColumn() {
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWide(element.offsetWidth >= WIDE_LISTINGS);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, wide };
}

function Listings({
  collection,
  pinnedEntryId,
  layout,
}: Props & { layout: Layout }) {
  const { user } = useUserState();
  const { data: listings } = useSuspenseQuery(
    collectionListingsQuery(collection.slug),
  );
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const stats = listingStats(listings);
  const pinned = listings.find((l) => l.entryId === pinnedEntryId);
  const others = useMemo(
    () =>
      listings
        .filter((l) => l.entryId !== pinnedEntryId)
        .sort((a, b) => compare(a, b, sortKey, sortDir)),
    [listings, pinnedEntryId, sortKey, sortDir],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortButtons = sortKeys.map((key) => (
    <SortButton
      key={key}
      active={sortKey === key}
      dir={sortDir}
      onClick={() => toggleSort(key)}
      className={
        layout === "wide"
          ? undefined
          : "h-8 flex-1 justify-center border-transparent"
      }
    >
      {sortLabels[key]()}
    </SortButton>
  ));

  const rows =
    listings.length === 0 ? (
      <Message>{m.listings_empty()}</Message>
    ) : (
      <>
        {pinned && (
          <>
            <SectionLabel wide={layout === "wide"}>
              {m.listings_this_listing()}
            </SectionLabel>
            <ListingRow
              collection={collection}
              listing={pinned}
              viewerId={user?.id}
              compact={layout !== "wide"}
              pinned
            />
            {others.length > 0 && (
              <SectionLabel wide={layout === "wide"}>
                {m.listings_other_listings({
                  count: others.length.toString(),
                })}
              </SectionLabel>
            )}
          </>
        )}
        {others.map((listing) => (
          <ListingRow
            key={listing.entryId}
            collection={collection}
            listing={listing}
            viewerId={user?.id}
            compact={layout !== "wide"}
          />
        ))}
      </>
    );

  if (layout !== "wide") {
    const summary = stats !== null && (
      <div className="flex items-center gap-1.5">
        <CountFrom stats={stats} />
        <FloorChange slug={collection.slug} floorUsd={stats.floorUsd} />
      </div>
    );

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {layout === "phone" ? (
          <PhoneHeader collection={collection}>{summary}</PhoneHeader>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3">
            <span className="font-cosmo text-sm font-black tracking-widest uppercase">
              {m.listings_title()}
            </span>
            {summary}
          </div>
        )}
        <div className="shrink-0 border-b border-border px-4 py-2.5">
          <div className="flex gap-1 rounded-md bg-secondary p-0.75 text-xxs font-medium tracking-widest uppercase">
            {sortButtons}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {rows}
          {stats !== null && (
            <FloorTrend
              collection={collection}
              className="mt-auto border-t border-border px-4 pt-3.5 pb-7"
              chartClassName="h-12"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-cosmo text-sm font-black tracking-widest uppercase">
            {m.listings_title()}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {m.listings_available({
              count: (stats?.count ?? 0).toString(),
            })}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xxs font-medium tracking-widest uppercase">
          {sortButtons}
        </div>
      </div>

      {stats !== null && (
        <ListingsStatsStrip collection={collection} stats={stats} />
      )}

      <div className="min-h-0 flex-1 overflow-auto">{rows}</div>
    </div>
  );
}

/**
 * Phone header: a thumbnail with the member and collection line, plus
 * whatever summary the listings have loaded.
 */
function PhoneHeader({
  collection,
  children,
}: {
  collection: Objekt.Collection;
  children?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 pt-1 pb-3.5">
      <img
        src={getObjektFrontImageUrl(collection, "xs")}
        alt={collection.collectionId}
        decoding="async"
        className="aspect-photocard w-14 shrink-0 rounded-[3px] bg-secondary object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-cosmo text-lg leading-none font-black uppercase">
          {collection.member}
        </span>
        <span className="truncate text-xxs font-medium tracking-widest text-muted-foreground uppercase">
          {collection.season} · {collection.collectionNo} · {collection.class}
        </span>
        {children}
      </div>
    </div>
  );
}

/**
 * "3 from NZ$3.54", with the price bold wherever each language puts it.
 */
function CountFrom({ stats }: { stats: ListingStats }) {
  const { formatUsd } = useDisplayCurrency();
  const price = formatUsd(stats.floorUsd);

  return (
    <span className="text-xs tabular-nums">
      <ParaglideMessage
        message={m.listings_from}
        inputs={{ count: stats.count.toString(), price: price.text }}
        markup={{
          price: () => (
            <ApproxPrice price={price} className="font-mono font-bold" />
          ),
        }}
      />
    </span>
  );
}

function Message({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function SectionLabel({
  wide,
  children,
}: {
  wide: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 border-b border-border px-4 pt-2.5 pb-1.5 data-[wide=true]:px-5"
      data-wide={wide}
    >
      <span className="text-xxs font-medium tracking-widest uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * Listings without a value for the key (no FX rate, unknown serial) sort last
 * in either direction. "Listed" ascending is newest first.
 */
function compare(
  a: CollectionListing,
  b: CollectionListing,
  key: SortKey,
  dir: SortDir,
) {
  const x = sortValue(a, key);
  const y = sortValue(b, key);
  if (x === null || y === null) {
    return Number(x === null) - Number(y === null);
  }
  return dir === "asc" ? x - y : y - x;
}

function sortValue(listing: CollectionListing, key: SortKey) {
  switch (key) {
    case "price":
      return listing.priceUsd;
    case "serial":
      return listing.serial;
    case "listed":
      return -new Date(listing.listedAt).getTime();
  }
}
