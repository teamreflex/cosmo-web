"use client";

import { useCollectionFilters } from "@/hooks/use-collection-filters";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo";
import { Toggle } from "../ui/toggle";
import { SlidersHorizontal } from "lucide-react";
import { SeasonFilter } from "../collection/filter-season";
import { OnlineFilter } from "../collection/filter-online";
import { ClassFilter } from "../collection/filter-class";
import { SortFilter } from "../collection/filter-sort";
import ObjektListList from "./objekt-list-list";
import { ObjektList } from "@/lib/universal/objekt-index";

type Props = {
  list: ObjektList;
  artists: CosmoArtistWithMembers[];
  authenticated: boolean;
};
export default function ObjektListRenderer({
  list,
  artists,
  authenticated,
}: Props) {
  const [showFilters, setShowFilters, filters, setFilters, updateFilter] =
    useCollectionFilters();

  return (
    <main className="container flex flex-col py-2">
      <div className="flex flex-col sm:gap-2 group" data-show={showFilters}>
        {/* header */}
        <div className="flex items-center justify-between pb-2 sm:pb-0">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-lg lg:text-3xl font-cosmo uppercase drop-shadow-lg">
              {list.name}
            </h1>
          </div>

          {/* list-related buttons */}
          {authenticated && <div>edit/delete</div>}

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

      <ObjektListList
        list={list}
        artists={artists}
        filters={filters}
        setFilters={setFilters}
        authenticated={authenticated}
      />
    </main>
  );
}
