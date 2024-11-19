"use client";

import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import ListDropdown from "../lists/list-dropdown";
import {
  IndexedCosmoResponse,
  IndexedObjekt,
  ObjektList,
  parsePage,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import { TopOverlay } from "./index-overlay";
import HelpDialog from "./help-dialog";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Fragment, memo, useCallback } from "react";
import {
  FiltersContainer,
  IndexFilters,
} from "../collection/filters-container";
import { ExpandableObjekt, RoutedExpandableObjekt } from "../objekt/objekt";
import { ofetch } from "ofetch";
import { baseUrl, GRID_COLUMNS } from "@/lib/utils";
import { parseAsString, useQueryState } from "nuqs";
import Hydrated from "../hydrated";

const queryKey = ["objekt-index"];
const getObjektId = (objekt: IndexedObjekt) => objekt.id;

type Props = {
  artists: CosmoArtistWithMembers[];
  collections: string[];
  objektLists?: ObjektList[];
  nickname?: string;
  gridColumns?: number;
  activeSlug?: string;
};

export default function IndexRenderer({
  artists,
  collections,
  objektLists,
  nickname,
  gridColumns = GRID_COLUMNS,
  activeSlug,
}: Props) {
  const [
    searchParams,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();
  const [, setActiveObjekt] = useQueryState("id", parseAsString);

  const authenticated = objektLists !== undefined && nickname !== undefined;

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: number }) => {
      const url = new URL("/api/objekts", baseUrl());
      return await ofetch(url.toString(), {
        query: {
          ...Object.fromEntries(searchParams.entries()),
          page: pageParam.toString(),
        },
      }).then((res) => parsePage<IndexedCosmoResponse>(res));
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
        queryFunction={queryFunction}
        queryKey={queryKey}
        getObjektId={getObjektId}
        gridColumns={gridColumns}
      >
        {({ objekt, id }, priority) => (
          <ExpandableObjekt
            objekt={objekt}
            id={id}
            setActive={setActiveObjekt}
            priority={priority}
          >
            <Overlay
              objekt={objekt}
              authenticated={authenticated}
              objektLists={objektLists}
            />
          </ExpandableObjekt>
        )}
      </FilteredObjektDisplay>

      {/**
       * if there's a slug in the url, open an expandable objekt dialog.
       * activeSlug is populated on first load from the server
       * using activeObjekt here results in two dialogs being open at once
       */}
      <Hydrated>
        {activeSlug !== undefined && (
          <RoutedExpandableObjekt
            slug={activeSlug}
            setActive={setActiveObjekt}
          />
        )}
      </Hydrated>
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
        <div className="min-w-24 text-right" id="objekt-total" />

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

type OverlayProps = {
  objekt: IndexedObjekt;
  authenticated: boolean;
  objektLists?: ObjektList[];
};

const Overlay = memo(function Overlay({
  objekt,
  authenticated,
  objektLists = [],
}: OverlayProps) {
  return (
    <Fragment>
      <ObjektSidebar collection={objekt.collectionNo} />
      {authenticated && (
        <TopOverlay objekt={objekt} objektLists={objektLists} />
      )}
    </Fragment>
  );
});
