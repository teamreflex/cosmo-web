"use client";

import {
  IndexedObjekt,
  LegacyObjektResponse,
  ObjektList,
  parsePage,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ListOverlay from "./list-overlay";
import DeleteList from "./delete-list";
import UpdateList from "./update-list";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { useFilters } from "@/hooks/use-filters";
import FiltersContainer from "../collection/filters-container";
import { ofetch } from "ofetch";
import { baseUrl } from "@/lib/query-client";
import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "../../lib/universal/objekt-conversion";
import { useMediaQuery } from "@/hooks/use-media-query";
import VirtualizedGrid from "../objekt/virtualized-grid";
import LoaderRemote from "../objekt/loader-remote";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";

type Props = {
  list: ObjektList;
  authenticated: boolean;
  user: PublicProfile;
  gridColumns: number;
};

export default function ListRenderer(props: Props) {
  const { searchParams } = useFilters();
  const isDesktop = useMediaQuery();

  const gridColumns = isDesktop ? props.gridColumns : 3;

  /**
   * Query options
   */
  const options = {
    filtering: "remote",
    queryKey: ["objekt-list", props.list.slug, props.user.address],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const url = new URL(
        `/api/objekt-list/entries/${props.list.slug}/${props.user.address}`,
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
    <section className="flex flex-col">
      <Title authenticated={props.authenticated} objektList={props.list} />

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
                      objektList={props.list}
                    />
                  </ExpandableObjekt>
                );
              }}
            </VirtualizedGrid>
          )}
        </LoaderRemote>
      </FilteredObjektDisplay>
    </section>
  );
}

function Title({
  authenticated,
  objektList,
}: {
  authenticated: boolean;
  objektList: ObjektList;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-xl font-cosmo">{objektList.name}</h3>

      {authenticated && (
        <div className="flex items-center gap-2">
          <UpdateList objektList={objektList} />
          <DeleteList objektList={objektList} />
        </div>
      )}
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
