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
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { useFilters } from "@/hooks/use-filters";
import { memo } from "react";
import {
  FiltersContainer,
  IndexFilters,
} from "../collection/filters-container";
import { ofetch } from "ofetch";
import { baseUrl, GRID_COLUMNS } from "@/lib/utils";
import { ObjektResponseOptions } from "@/hooks/use-objekt-response";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "../../lib/universal/objekt-conversion";

const getObjektId = (objekt: IndexedObjekt) => objekt.id;

type Props = {
  list: ObjektList;
  artists: CosmoArtistWithMembersBFF[];
  authenticated: boolean;
  user: PublicProfile;
  gridColumns?: number;
};

export default function ListRenderer({
  list,
  artists,
  authenticated,
  user,
  gridColumns = GRID_COLUMNS,
}: Props) {
  const { searchParams } = useFilters();

  /**
   * Query options
   */
  const options = {
    queryKey: ["objekt-list", list.slug, user.address],
    queryFunction: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const url = new URL(
        `/api/objekt-list/entries/${list.slug}/${user.address}`,
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
      <Title authenticated={authenticated} objektList={list} />

      <FiltersContainer isPortaled>
        <IndexFilters collections={[]} />
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
          const objekt = Objekt.fromIndexer(item);
          return (
            <ExpandableObjekt objekt={objekt} id={id}>
              <Overlay
                objekt={item}
                authenticated={authenticated}
                objektList={list}
              />
            </ExpandableObjekt>
          );
        }}
      </FilteredObjektDisplay>
    </section>
  );
}

const Title = memo(function Title({
  authenticated,
  objektList,
}: {
  authenticated: boolean;
  objektList: ObjektList;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between pb-2 gap-2">
      <h3 className="text-xl font-cosmo">{objektList.name}</h3>

      {authenticated && (
        <div className="flex items-center gap-2">
          <UpdateList objektList={objektList} />
          <DeleteList objektList={objektList} />
        </div>
      )}
    </div>
  );
});

type OverlayProps = {
  objekt: IndexedObjekt;
  authenticated: boolean;
  objektList: ObjektList;
};

function Overlay({ objekt, authenticated, objektList }: OverlayProps) {
  return (
    <div className="contents">
      <ObjektSidebar collection={objekt.collectionNo} />
      {authenticated && <ListOverlay objekt={objekt} objektList={objektList} />}
    </div>
  );
}
