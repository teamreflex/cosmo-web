"use client";

import {
  IndexedCosmoResponse,
  IndexedObjekt,
  ObjektList,
  parsePage,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import ListOverlay from "./list-overlay";
import DeleteList from "./delete-list";
import UpdateList from "./update-list";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { useFilters } from "@/hooks/use-filters";
import { memo, useCallback } from "react";
import {
  FiltersContainer,
  IndexFilters,
} from "../collection/filters-container";
import { ExpandableObjekt } from "../objekt/objekt";
import { ofetch } from "ofetch";
import { baseUrl, GRID_COLUMNS } from "@/lib/utils";

const getObjektId = (objekt: IndexedObjekt) => objekt.id;

type Props = {
  list: ObjektList;
  artists: CosmoArtistWithMembers[];
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

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: number }) => {
      const url = new URL(
        `/api/objekt-list/entries/${list.slug}/${user.address}`,
        baseUrl()
      );

      return await ofetch(url.toString(), {
        query: {
          ...Object.fromEntries(searchParams.entries()),
          page: pageParam.toString(),
        },
      }).then((res) => parsePage<IndexedCosmoResponse>(res));
    },
    [searchParams, list.slug, user.address]
  );

  return (
    <section className="flex flex-col">
      <Title authenticated={authenticated} objektList={list} />

      <FiltersContainer isPortaled>
        <IndexFilters collections={[]} />
      </FiltersContainer>

      <FilteredObjektDisplay
        artists={artists}
        queryFunction={queryFunction}
        queryKey={["objekt-list", list.slug]}
        getObjektId={getObjektId}
        gridColumns={gridColumns}
      >
        {({ objekt, id }, priority) => (
          <ExpandableObjekt objekt={objekt} id={id} priority={priority}>
            <Overlay
              objekt={objekt}
              authenticated={authenticated}
              objektList={list}
            />
          </ExpandableObjekt>
        )}
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
