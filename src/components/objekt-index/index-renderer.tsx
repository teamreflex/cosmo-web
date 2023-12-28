"use client";

import { SlidersHorizontal } from "lucide-react";
import { Toggle } from "../ui/toggle";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
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
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Fragment, useCallback } from "react";
import {
  FiltersContainer,
  IndexFilters,
} from "../collection/filters-container";

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
              variant="secondary"
              size="sm"
              pressed={showFilters}
              onPressedChange={setShowFilters}
              className="h-10 w-10 sm:hidden rounded-full"
            >
              <SlidersHorizontal />
            </Toggle>
          </div>
        </div>

        {/* filters */}
        <FiltersContainer>
          <IndexFilters
            cosmoFilters={cosmoFilters}
            updateCosmoFilters={updateCosmoFilters}
            collections={collections}
          />
        </FiltersContainer>
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
          <Fragment>
            <ObjektSidebar />
            {authenticated && <TopOverlay lists={objektLists} />}
            <BottomOverlay />
          </Fragment>
        }
      />
    </>
  );
}
