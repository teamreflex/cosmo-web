"use client";

import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import ListDropdown from "../lists/list-dropdown";
import {
  IndexedObjekt,
  LegacyObjektResponse,
  ObjektList,
  parsePage,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import { TopOverlay } from "./index-overlay";
import HelpDialog from "./help-dialog";
import { useFilters } from "@/hooks/use-filters";
import { memo } from "react";
import {
  FiltersContainer,
  IndexFilters,
} from "../collection/filters-container";
import { ofetch } from "ofetch";
import { baseUrl, GRID_COLUMNS } from "@/lib/utils";
import { parseAsString, useQueryState } from "nuqs";
import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { ObjektSidebar } from "../objekt/common";
import RoutedExpandableObjekt from "../objekt/objekt-routed";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "../../lib/universal/objekt-conversion";

const getObjektId = (objekt: IndexedObjekt) => objekt.id;

type Props = {
  artists: CosmoArtistWithMembersBFF[];
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
  const { searchParams } = useFilters();
  const [, setActiveObjekt] = useQueryState("id", parseAsString);

  const authenticated = objektLists !== undefined && nickname !== undefined;

  /**
   * Query options
   */
  const options = {
    queryKey: ["objekt-index", "blockchain"],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const url = new URL("/api/objekts", baseUrl());
      return await ofetch(url.toString(), {
        query: {
          ...Object.fromEntries(searchParams.entries()),
          page: pageParam,
        },
      }).then((res) => parsePage<LegacyObjektResponse<IndexedObjekt>>(res));
    },
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    calculateTotal: (data) => {
      const total = data.pages[0].total ?? 0;
      return (
        <p className="font-semibold">{total.toLocaleString("en")} total</p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  } satisfies ObjektResponseOptions<
    LegacyObjektResponse<IndexedObjekt>,
    IndexedObjekt
  >;

  return (
    <div className="flex flex-col">
      <Title nickname={nickname} objektLists={objektLists} />

      <FiltersContainer>
        <IndexFilters collections={collections} />
      </FiltersContainer>

      <FilteredObjektDisplay
        artists={artists}
        options={options}
        getObjektId={getObjektId}
        shouldRender={() => true}
        gridColumns={gridColumns}
        authenticated={authenticated}
      >
        {({ item, id }) => {
          const collection = Objekt.fromIndexer(item);
          return (
            <ExpandableObjekt
              collection={collection}
              setActive={setActiveObjekt}
            >
              <Overlay
                objekt={item}
                authenticated={authenticated}
                objektLists={objektLists}
              />
            </ExpandableObjekt>
          );
        }}
      </FilteredObjektDisplay>

      {/**
       * if there's a slug in the url, open an expandable objekt dialog.
       * activeSlug is populated on first load from the server
       * using activeObjekt here results in two dialogs being open at once
       */}
      {activeSlug !== undefined && (
        <RoutedExpandableObjekt slug={activeSlug} setActive={setActiveObjekt} />
      )}
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

function Overlay({ objekt, authenticated, objektLists = [] }: OverlayProps) {
  return (
    <div className="contents">
      <ObjektSidebar collection={objekt.collectionNo} />
      {authenticated && (
        <TopOverlay objekt={objekt} objektLists={objektLists} />
      )}
    </div>
  );
}
