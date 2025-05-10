"use client";

import {
  IndexedObjekt,
  LegacyObjektResponse,
  parsePage,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ListOverlay from "./list-overlay";
import DeleteList from "./delete-list";
import UpdateList from "./update-list";
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
import { useProfileContext } from "@/hooks/use-profile";
import { useGridColumns } from "@/hooks/use-grid-columns";

type Props = {
  objektList: ObjektList;
  authenticated: boolean;
};

export default function ListRenderer(props: Props) {
  const { searchParams } = useFilters();
  const user = useProfileContext((ctx) => ctx.target!.user);
  const gridColumns = useGridColumns();

  /**
   * Query options
   */
  const options = {
    filtering: "remote",
    queryKey: ["objekt-list", props.objektList.slug, user!.id],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const url = new URL(
        `/api/objekt-list/entries/${props.objektList.slug}/${user!.id}`,
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
      <Title
        authenticated={props.authenticated}
        objektList={props.objektList}
      />

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
    </section>
  );
}

type TitleProps = {
  authenticated: boolean;
  objektList: ObjektList;
};

function Title(props: TitleProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-xl font-cosmo">{props.objektList.name}</h3>

      {props.authenticated && (
        <div className="flex items-center gap-2">
          <UpdateList objektList={props.objektList} />
          <DeleteList objektList={props.objektList} />
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
