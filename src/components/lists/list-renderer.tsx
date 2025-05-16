"use client";

import {
  IndexedObjekt,
  LegacyObjektResponse,
  parsePage,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ListOverlay from "./list-overlay";
import { useFilters } from "@/hooks/use-filters";
import FiltersContainer from "../collection/filters-container";
import { ofetch } from "ofetch";
import { baseUrl } from "@/lib/query-client";
import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "../../lib/universal/objekt-conversion";
import VirtualizedGrid from "../objekt/virtualized-grid";
import LoaderRemote from "../objekt/loader-remote";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import type { ObjektList } from "@/lib/server/db/schema";
import { useGridColumns } from "@/hooks/use-grid-columns";

type Props = {
  objektList: ObjektList;
  authenticated: boolean;
};

export default function ListRenderer(props: Props) {
  const { searchParams } = useFilters();
  const gridColumns = useGridColumns();

  /**
   * Query options
   */
  const options = {
    filtering: "remote",
    queryKey: ["objekt-list", props.objektList.id],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const url = new URL(
        `/api/objekt-list/entries/${props.objektList.id}`,
        baseUrl()
      );

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
      <FiltersContainer isPortaled>
        <ObjektIndexFilters />
      </FiltersContainer>

      <FilteredObjektDisplay gridColumns={gridColumns}>
        <LoaderRemote options={options} gridColumns={gridColumns} showTotal>
          {({ rows }) => (
            <VirtualizedGrid
              rows={rows}
              getObjektId={(objekt) => objekt.id}
              authenticated={props.authenticated}
              gridColumns={gridColumns}
            >
              {({ item, priority }) => {
                const collection = Objekt.fromIndexer(item);
                return (
                  <ExpandableObjekt collection={collection} priority={priority}>
                    <Overlay
                      id={item.id}
                      collection={collection}
                      authenticated={props.authenticated}
                      objektList={props.objektList}
                    />
                  </ExpandableObjekt>
                );
              }}
            </VirtualizedGrid>
          )}
        </LoaderRemote>
      </FilteredObjektDisplay>
    </div>
  );
}

type OverlayProps = {
  id: string;
  collection: Objekt.Collection;
  authenticated: boolean;
  objektList: ObjektList;
};

function Overlay({ id, collection, authenticated, objektList }: OverlayProps) {
  return (
    <div className="contents">
      <ObjektSidebar
        collection={collection.collectionNo}
        artist={collection.artist}
        member={collection.member}
      />
      {authenticated && (
        <ListOverlay id={id} collection={collection} objektList={objektList} />
      )}
    </div>
  );
}
