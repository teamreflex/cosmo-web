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
import { useFilters } from "@/hooks/use-filters";
import FiltersContainer from "../collection/filters-container";
import { ofetch } from "ofetch";
import { baseUrl } from "@/lib/utils";
import { parseAsString, useQueryState } from "nuqs";
import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { ObjektSidebar } from "../objekt/common";
import RoutedExpandableObjekt from "../objekt/objekt-routed";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "../../lib/universal/objekt-conversion";
import { Button } from "../ui/button";
import Link from "next/link";
import { ChartColumnBig } from "lucide-react";
import VirtualizedGrid from "../objekt/virtualized-grid";
import { useMediaQuery } from "@/hooks/use-media-query";
import LoaderRemote from "../objekt/loader-remote";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import { useSelectedArtists } from "@/hooks/use-selected-artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  objektLists?: ObjektList[];
  nickname?: string;
  gridColumns: number;
  activeSlug?: string;
};

export default function IndexRenderer(props: Props) {
  const { searchParams } = useFilters();
  const selectedArtists = useSelectedArtists();
  const [, setActiveObjekt] = useQueryState("id", parseAsString);
  const isDesktop = useMediaQuery();

  const authenticated =
    props.objektLists !== undefined && props.nickname !== undefined;
  const gridColumns = isDesktop ? props.gridColumns : 3;

  /**
   * Query options
   */
  const options = {
    filtering: "remote",
    queryKey: ["objekt-index", "blockchain"],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const url = new URL("/api/objekts", baseUrl());
      return await ofetch(url.toString(), {
        query: {
          ...Object.fromEntries(searchParams.entries()),
          page: pageParam,
          artists: selectedArtists,
        },
      }).then((res) => parsePage<LegacyObjektResponse<IndexedObjekt>>(res));
    },
    initialPageParam: 0,
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
      <Title nickname={props.nickname} objektLists={props.objektLists} />

      <FiltersContainer>
        <ObjektIndexFilters />
      </FiltersContainer>

      <FilteredObjektDisplay artists={props.artists} gridColumns={gridColumns}>
        <LoaderRemote options={options} gridColumns={gridColumns} showTotal>
          {({ rows }) => (
            <VirtualizedGrid
              rows={rows}
              getObjektId={(objekt) => objekt.id}
              authenticated={authenticated}
              gridColumns={gridColumns}
            >
              {({ item, priority }) => {
                const collection = Objekt.fromIndexer(item);
                return (
                  <ExpandableObjekt
                    collection={collection}
                    setActive={setActiveObjekt}
                    priority={priority}
                  >
                    <Overlay
                      objekt={item}
                      authenticated={authenticated}
                      objektLists={props.objektLists}
                    />
                  </ExpandableObjekt>
                );
              }}
            </VirtualizedGrid>
          )}
        </LoaderRemote>
      </FilteredObjektDisplay>

      {/**
       * if there's a slug in the url, open an expandable objekt dialog.
       * activeSlug is populated on first load from the server
       * using activeObjekt here results in two dialogs being open at once
       */}
      {props.activeSlug !== undefined && (
        <RoutedExpandableObjekt
          slug={props.activeSlug}
          setActive={setActiveObjekt}
        />
      )}
    </div>
  );
}

function Title({
  nickname,
  objektLists,
}: {
  nickname?: string;
  objektLists?: ObjektList[];
}) {
  return (
    <div className="flex gap-2 items-center w-full pb-1">
      <h1 className="text-3xl font-cosmo uppercase">Objekts</h1>

      <Button variant="secondary" size="profile" data-profile asChild>
        <Link href="/objekts/stats">
          <ChartColumnBig className="h-5 w-5" />
          <span>Stats</span>
        </Link>
      </Button>

      <div className="flex gap-2 items-center last:ml-auto">
        <div className="min-w-24 text-right" id="objekt-total" />

        {nickname !== undefined && objektLists !== undefined && (
          <Options nickname={nickname} objektLists={objektLists} />
        )}
      </div>
    </div>
  );
}

function Options({
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
}

type OverlayProps = {
  objekt: IndexedObjekt;
  authenticated: boolean;
  objektLists?: ObjektList[];
};

function Overlay({ objekt, authenticated, objektLists = [] }: OverlayProps) {
  return (
    <div className="contents">
      <ObjektSidebar
        collection={objekt.collectionNo}
        artist={objekt.artist as ValidArtist}
        member={objekt.member}
      />
      {authenticated && (
        <TopOverlay objekt={objekt} objektLists={objektLists} />
      )}
    </div>
  );
}
