import ObjektPanel from "@/components/objekt/detail/objekt-panel";
import SortButton, {
  type SortDir,
} from "@/components/objekt/detail/sort-button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { collectionListingsQuery } from "@/lib/queries/listings";
import type { CollectionListing } from "@/lib/universal/listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { formatPrice } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Suspense, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ListingRow from "./listing-row";

type SortKey = "price" | "serial" | "listed";

type Props = {
  collection: Objekt.Collection;
  pinnedEntryId?: string;
};

export default function ListingsContent({ collection, pinnedEntryId }: Props) {
  const isDesktop = useMediaQuery();

  return (
    <div
      className="grid min-h-0 flex-1 data-[desktop=false]:grid-cols-1 data-[desktop=false]:grid-rows-[auto_1fr] data-[desktop=true]:grid-cols-[minmax(280px,380px)_1fr] data-[desktop=true]:overflow-hidden"
      data-desktop={isDesktop}
    >
      <ObjektPanel collection={collection} isDesktop={isDesktop} />

      <ErrorBoundary fallback={<Message>{m.error_loading_objekt()}</Message>}>
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Listings collection={collection} pinnedEntryId={pinnedEntryId} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function Listings({ collection, pinnedEntryId }: Props) {
  const { user } = useUserState();
  const { data: listings } = useSuspenseQuery(
    collectionListingsQuery(collection.slug),
  );
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const pinned = listings.find((l) => l.entryId === pinnedEntryId);
  const others = useMemo(() => {
    const copy = listings.filter((l) => l.entryId !== pinnedEntryId);
    copy.sort((a, b) => compare(a, b, sortKey));
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [listings, pinnedEntryId, sortKey, sortDir]);

  const floor = listings.reduce<number | null>(
    (min, l) =>
      l.priceUsd !== null && (min === null || l.priceUsd < min)
        ? l.priceUsd
        : min,
    null,
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-baseline gap-2">
          <span className="hidden font-cosmo text-sm font-black tracking-[0.14em] uppercase sm:block">
            {m.listings_title()}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {m.listings_available({ count: listings.length.toString() })}
            {floor !== null && (
              <>
                {" · "}
                {m.listings_floor({ price: formatPrice(floor, "USD") })}
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-xxs tracking-[0.14em] uppercase">
          <SortButton
            active={sortKey === "price"}
            dir={sortDir}
            onClick={() => toggleSort("price")}
          >
            {m.list_sale_price()}
          </SortButton>
          <SortButton
            active={sortKey === "serial"}
            dir={sortDir}
            onClick={() => toggleSort("serial")}
          >
            {m.detail_sort_serial()}
          </SortButton>
          <SortButton
            active={sortKey === "listed"}
            dir={sortDir}
            onClick={() => toggleSort("listed")}
          >
            {m.listings_listed()}
          </SortButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {listings.length === 0 ? (
          <Message>{m.listings_empty()}</Message>
        ) : (
          <>
            {pinned && (
              <>
                <SectionLabel>{m.listings_this_listing()}</SectionLabel>
                <ListingRow
                  collection={collection}
                  listing={pinned}
                  viewerId={user?.id}
                  pinned
                />
                {others.length > 0 && (
                  <SectionLabel>
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
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function Message({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 pt-2.5 pb-1.5 sm:px-5">
      <span className="font-mono text-xxs tracking-[0.14em] uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function compare(a: CollectionListing, b: CollectionListing, key: SortKey) {
  switch (key) {
    case "price":
      return (a.priceUsd ?? a.price) - (b.priceUsd ?? b.price);
    case "serial":
      return (
        (a.serial ?? Number.MAX_SAFE_INTEGER) -
        (b.serial ?? Number.MAX_SAFE_INTEGER)
      );
    case "listed":
      return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
  }
}
