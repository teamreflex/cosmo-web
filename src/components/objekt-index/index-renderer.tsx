"use client";

import { SlidersHorizontal } from "lucide-react";
import { Toggle } from "../ui/toggle";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo";
import {
  CollectionFilters,
  collectionFilters,
  useCollectionFilters,
} from "@/hooks/use-collection-filters";
import { SeasonFilter } from "../collection/filter-season";
import { OnlineFilter } from "../collection/filter-online";
import { ClassFilter } from "../collection/filter-class";
import { SortFilter } from "../collection/filter-sort";
import ListDropdown from "../lists/list-dropdown";
import {
  IndexedCosmoResponse,
  IndexedObjekt,
  ObjektList,
} from "@/lib/universal/objekt-index";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import { toSearchParams } from "@/hooks/use-typed-search-params";
import ObjektSidebar from "../objekt/objekt-sidebar";
import IndexOverlay from "./index-overlay";

export type PropsWithFilters<T extends keyof CollectionFilters> = {
  filters: CollectionFilters[T];
  setFilters: (filters: CollectionFilters[T]) => void;
};

type Props = {
  artists: CosmoArtistWithMembers[];
  objektLists?: ObjektList[];
  nickname?: string;
};

export default function IndexRenderer({
  artists,
  objektLists,
  nickname,
}: Props) {
  const [showFilters, setShowFilters, filters, setFilters, updateFilter] =
    useCollectionFilters();

  const authenticated = objektLists !== undefined && nickname !== undefined;

  async function fetcher({ pageParam = 0 }) {
    const searchParams = toSearchParams<typeof collectionFilters>(
      filters,
      false
    );
    searchParams.set("page", pageParam.toString());

    const result = await fetch(`/api/objekts?${searchParams.toString()}`);
    return (await result.json()) as IndexedCosmoResponse;
  }

  return (
    <>
      <div className="flex flex-col sm:gap-2 group" data-show={showFilters}>
        {/* header */}
        <div className="flex items-center justify-between pb-2 sm:pb-0">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
              Objekts
            </h1>
          </div>

          {/* objekt list button */}
          {authenticated && (
            <ListDropdown lists={objektLists} nickname={nickname} />
          )}

          {/* mobile: options */}
          <div className="flex sm:hidden items-center gap-2">
            {/* show filters */}
            <Toggle pressed={showFilters} onPressedChange={setShowFilters}>
              <SlidersHorizontal className="drop-shadow-lg" />
            </Toggle>
          </div>
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-fit sm:group-data-[show=true]:h-fit group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          <SeasonFilter
            filters={filters.season}
            setFilters={(f) => updateFilter("season", f)}
          />
          <OnlineFilter
            filters={filters.on_offline}
            setFilters={(f) => updateFilter("on_offline", f)}
          />
          <ClassFilter
            filters={filters.class}
            setFilters={(f) => updateFilter("class", f)}
          />
          <SortFilter
            filters={filters.sort}
            setFilters={(f) => updateFilter("sort", f)}
          />
        </div>
      </div>

      <FilteredObjektDisplay
        artists={artists}
        filters={filters}
        setFilters={setFilters}
        authenticated={authenticated}
        queryFunction={fetcher}
        queryKey="objekt-index"
        getObjektId={(objekt: IndexedObjekt) => objekt.id}
        getObjektDisplay={() => true}
        objektSlot={
          <>
            <ObjektSidebar />
            {authenticated && <IndexOverlay lists={objektLists} />}
          </>
        }
      />
    </>
  );
}