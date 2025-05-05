"use client";

import ListDropdown from "../lists/list-dropdown";
import {
  IndexedObjekt,
  LegacyObjektResponse,
  parsePage,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import { TopOverlay } from "./index-overlay";
import { useFilters } from "@/hooks/use-filters";
import FiltersContainer from "../collection/filters-container";
import { ofetch } from "ofetch";
import { baseUrl } from "@/lib/query-client";
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
import { useProfileContext } from "@/hooks/use-profile";

type Props = {
  activeSlug?: string;
};

export default function IndexRenderer(props: Props) {
  const isDesktop = useMediaQuery();
  const currentUser = useProfileContext((ctx) => ctx.currentUser);
  const gridColumns = useProfileContext((ctx) =>
    isDesktop ? ctx.gridColumns : 3
  );
  const { searchParams } = useFilters();
  const { selectedIds } = useSelectedArtists();
  const [, setActiveObjekt] = useQueryState("id", parseAsString);

  const authenticated = currentUser !== undefined;

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
          artists: selectedIds,
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
      <Title />

      <FiltersContainer>
        <ObjektIndexFilters />
      </FiltersContainer>

      <FilteredObjektDisplay gridColumns={gridColumns}>
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
                    <Overlay objekt={item} authenticated={authenticated} />
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

function Title() {
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

        <Options />
      </div>
    </div>
  );
}

function Options() {
  const currentUser = useProfileContext((ctx) => ctx.currentUser);
  const objektLists = useProfileContext((ctx) => ctx.objektLists);

  if (!currentUser) return null;

  return (
    <div className="flex gap-2 items-center">
      <ListDropdown lists={objektLists} allowCreate={true} />
    </div>
  );
}

type OverlayProps = {
  objekt: IndexedObjekt;
  authenticated: boolean;
};

function Overlay({ objekt, authenticated }: OverlayProps) {
  const objektLists = useProfileContext((ctx) => ctx.objektLists);

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
