"use client";

import { SlidersHorizontal } from "lucide-react";
import { Toggle } from "../ui/toggle";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { SeasonFilter } from "../collection/filter-season";
import { OnlineFilter } from "../collection/filter-online";
import { ClassFilter } from "../collection/filter-class";
import { SortFilter } from "../collection/filter-sort";
import ListDropdown from "../lists/list-dropdown";
import {
  IndexedCosmoResponse,
  IndexedObjekt,
  ObjektList,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import { BottomOverlay, TopOverlay } from "./index-overlay";
import HelpDialog from "./help-dialog";
import { CollectionFilter } from "./collection-filter";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useCallback } from "react";

type Props = {
  artists: CosmoArtistWithMembers[];
  collections: string[];
  objektLists?: ObjektList[];
  nickname?: string;
};

export default function IndexRenderer({
  artists,
  collections,
  objektLists,
  nickname,
}: Props) {
  const [
    searchParams,
    showFilters,
    setShowFilters,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();

  const authenticated = objektLists !== undefined && nickname !== undefined;

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: string | number }) => {
      const query = new URLSearchParams(searchParams);
      query.set("page", pageParam.toString());

      const result = await fetch(`/api/objekts?${query.toString()}`);
      return (await result.json()) as IndexedCosmoResponse;
    },
    [searchParams]
  );

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

            <HelpDialog />

            <div id="objekt-total" />
          </div>

          <div className="flex gap-2 items-center">
            {/* objekt list button */}
            {authenticated && (
              <ListDropdown
                lists={objektLists}
                nickname={nickname}
                allowCreate={authenticated}
              />
            )}

            {/* mobile: filters */}
            <Toggle
              pressed={showFilters}
              onPressedChange={setShowFilters}
              className="block sm:hidden"
            >
              <SlidersHorizontal className="drop-shadow-lg" />
            </Toggle>
          </div>
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-fit sm:group-data-[show=true]:h-fit group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-24 gap-2 items-center flex-wrap justify-center">
          <SeasonFilter
            filters={cosmoFilters.season}
            setFilters={(f) => updateCosmoFilters("season", f)}
          />
          <CollectionFilter
            filters={cosmoFilters.collectionNo}
            setFilters={(f) => updateCosmoFilters("collectionNo", f)}
            collections={collections}
          />
          <OnlineFilter
            filters={cosmoFilters.on_offline}
            setFilters={(f) => updateCosmoFilters("on_offline", f)}
          />
          <ClassFilter
            filters={cosmoFilters.class}
            setFilters={(f) => updateCosmoFilters("class", f)}
          />
          <SortFilter
            filters={cosmoFilters.sort}
            setFilters={(f) => updateCosmoFilters("sort", f)}
          />
        </div>
      </div>

      <FilteredObjektDisplay
        artists={artists}
        filters={cosmoFilters}
        setFilters={setCosmoFilters}
        authenticated={authenticated}
        queryFunction={queryFunction}
        queryKey={["objekt-index"]}
        getObjektId={(objekt: IndexedObjekt) => objekt.id}
        getObjektDisplay={() => true}
        objektSlot={
          <>
            <ObjektSidebar />
            {authenticated && <TopOverlay lists={objektLists} />}
            <BottomOverlay />
          </>
        }
      />
    </>
  );
}
