"use client";

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
import { Fragment, memo, useCallback } from "react";
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
    <div className="flex flex-col">
      <Title nickname={nickname} objektLists={objektLists} />

      <FiltersContainer>
        <IndexFilters
          cosmoFilters={cosmoFilters}
          updateCosmoFilters={updateCosmoFilters}
          collections={collections}
        />
      </FiltersContainer>

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
    </div>
  );
}

const Title = memo(function Title({
  nickname,
  objektLists,
}: {
  nickname?: string;
  objektLists?: ObjektList[];
}) {
  return (
    <div className="flex gap-2 items-center w-full pb-1">
      <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">Objekts</h1>

      <HelpDialog />

      <div className="flex gap-2 items-center last:ml-auto">
        <div id="objekt-total" />

        {nickname !== undefined && objektLists !== undefined && (
          <Options nickname={nickname} objektLists={objektLists} />
        )}
      </div>
    </div>
  );
});

const Options = memo(function Options({
  nickname,
  objektLists,
}: {
  nickname: string;
  objektLists: ObjektList[];
}) {
  return (
    <div className="flex gap-2 items-center">
      <ListDropdown
        lists={objektLists}
        nickname={nickname}
        allowCreate={true}
      />
    </div>
  );
});
