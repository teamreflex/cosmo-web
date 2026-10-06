import ObjektPanel from "@/components/objekt/detail/objekt-panel";
import SortButton, {
  type SortDir,
} from "@/components/objekt/detail/sort-button";
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
import { IconLoader2 } from "@tabler/icons-react";
import { usePrefetchQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Suspense, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ListingRow from "./listing-row";
import { FloorChange, FloorTrend, ListingsStatsStrip } from "./listings-stats";
import { WatchButton } from "./watch-button";

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
 * Desktop puts the full objekt beside the listings; phones get a thumbnail
 * header above them instead.
 */
export default function ListingsContent({ collection, pinnedEntryId }: Props) {
  const isDesktop = useMediaQuery();
  usePrefetchQuery(objektPriceHistoryQuery(collection.slug, "30d"));

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
          isDesktop={isDesktop}
        />
      </Suspense>
    </ErrorBoundary>
  );

  if (!isDesktop) {
    return <div className="flex min-h-0 flex-1 flex-col">{listings}</div>;
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,380px)_1fr] overflow-hidden">
      <ObjektPanel collection={collection} isDesktop />
      {/* the panel alone sets the height, so long lists scroll instead of growing the dialog */}
      <div className="flex min-h-0 flex-col contain-size">{listings}</div>
    </div>
  );
}

function Listings({
  collection,
  pinnedEntryId,
  isDesktop,
}: Props & { isDesktop: boolean }) {
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
        isDesktop ? undefined : "h-8 flex-1 justify-center border-transparent"
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
            <SectionLabel isDesktop={isDesktop}>
              {m.listings_this_listing()}
            </SectionLabel>
            <ListingRow
              collection={collection}
              listing={pinned}
              viewerId={user?.id}
              isDesktop={isDesktop}
              pinned
            />
            {others.length > 0 && (
              <SectionLabel isDesktop={isDesktop}>
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
            isDesktop={isDesktop}
          />
        ))}
      </>
    );

  if (!isDesktop) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PhoneHeader
          collection={collection}
          action={user && <WatchButton collection={collection} />}
        >
          {stats !== null && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <CountFrom stats={stats} />
              <FloorChange slug={collection.slug} />
            </div>
          )}
        </PhoneHeader>
        <div className="shrink-0 border-b border-border px-4 py-2.5">
          <div className="flex gap-1 rounded-md bg-secondary p-0.75 font-mono text-xxs tracking-widest uppercase">
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
          <span className="font-mono text-xs text-muted-foreground">
            {m.listings_available({
              count: (stats?.count ?? 0).toString(),
            })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user && <WatchButton collection={collection} />}
          <div className="flex items-center gap-1 font-mono text-xxs tracking-widest uppercase">
            {sortButtons}
          </div>
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
  action,
  children,
}: {
  collection: Objekt.Collection;
  action?: ReactNode;
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
        <span className="truncate font-mono text-xxs tracking-widest text-muted-foreground uppercase">
          {collection.season} · {collection.collectionNo} · {collection.class}
        </span>
        {children}
      </div>
      {action}
    </div>
  );
}

/**
 * "3 from NZ$3.54", with the price bold wherever each language puts it.
 */
function CountFrom({ stats }: { stats: ListingStats }) {
  const { formatUsd } = useDisplayCurrency();
  const price = formatUsd(stats.floorUsd);
  const [before, after] = m
    .listings_from({ count: stats.count.toString(), price })
    .split(price);

  return (
    <span className="font-mono text-xs">
      {before}
      <b>{price}</b>
      {after}
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
  isDesktop,
  children,
}: {
  isDesktop: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 border-b border-border px-4 pt-2.5 pb-1.5 data-[desktop=true]:px-5"
      data-desktop={isDesktop}
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
