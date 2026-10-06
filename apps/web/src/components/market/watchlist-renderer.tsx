import { useGridColumns } from "@/hooks/use-grid-columns";
import { useWatchlist, useWatchlistQuery } from "@/hooks/use-watchlist";
import { m } from "@/i18n/messages";
import { IconEye } from "@tabler/icons-react";
import { watchedSlugsQuery } from "@/lib/queries/watchlist";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import FiltersContainer from "../collection/filters-container";
import CosmoMemberFilter from "../objekt/cosmo-member-filter";
import ObjektTotalSlot from "../objekt/objekt-total-slot";
import VirtualizedObjektGrid from "../objekt/virtualized-objekt-grid";
import TitleHeader from "../ui/title-header";
import WatchlistFilters from "./watchlist-filters";
import { WatchlistGridItem } from "./watchlist-grid-item";

export default function WatchlistRenderer() {
  const gridColumns = useGridColumns();
  const options = useWatchlist();

  return (
    <div className="flex flex-col">
      <TitleHeader title={m.watchlist_header()} total={<ObjektTotalSlot />}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <CosmoMemberFilter />
          </div>
        </div>
      </TitleHeader>

      <FiltersContainer>
        <WatchlistFilters />
      </FiltersContainer>

      <div className="container flex flex-col">
        <VirtualizedObjektGrid
          options={options}
          gridColumns={gridColumns}
          getObjektId={(objekt) => objekt.id}
          authenticated
          ItemComponent={WatchlistGridItem}
          showTotal
        />
        <Suspense fallback={null}>
          <EmptyWatchlist />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * The grid renders nothing without items, so say why.
 */
function EmptyWatchlist() {
  const { data } = useSuspenseInfiniteQuery(useWatchlistQuery());
  const { data: watched } = useSuspenseQuery(watchedSlugsQuery);
  const [first] = data.pages;
  if (first === undefined || first.objekts.length > 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <IconEye className="size-10 text-muted-foreground" />
      <p className="max-w-md text-sm text-muted-foreground">
        {watched.length === 0 ? m.watchlist_empty() : m.watchlist_no_matches()}
      </p>
    </div>
  );
}
