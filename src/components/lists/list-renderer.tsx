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
import { SearchUser } from "@/lib/universal/cosmo/auth";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Fragment, memo, useCallback } from "react";
import {
  FiltersContainer,
  IndexFilters,
} from "../collection/filters-container";
import Objekt from "../objekt/objekt";

type Props = {
  list: ObjektList;
  artists: CosmoArtistWithMembers[];
  authenticated: boolean;
  user: SearchUser;
};
export default function ListRenderer({
  list,
  artists,
  authenticated,
  user,
}: Props) {
  const [
    searchParams,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: number }) => {
      const query = new URLSearchParams(searchParams);
      query.set("page", pageParam.toString());
      query.set("list", list.slug);
      query.set("address", user.address);

      const result = await fetch(`/api/objekts?${query.toString()}`);
      return parsePage<IndexedCosmoResponse>(await result.json());
    },
    [searchParams, list.slug, user.address]
  );

  return (
    <section className="flex flex-col">
      <Title authenticated={authenticated} objektList={list} />

      <FiltersContainer isPortaled>
        <IndexFilters
          cosmoFilters={cosmoFilters}
          updateCosmoFilters={updateCosmoFilters}
          collections={[]}
        />
      </FiltersContainer>

      <FilteredObjektDisplay
        artists={artists}
        filters={cosmoFilters}
        setFilters={setCosmoFilters}
        queryFunction={queryFunction}
        queryKey={["objekt-list", list.slug]}
        getObjektId={(objekt: IndexedObjekt) => objekt.id}
        getObjektDisplay={() => true}
      >
        {({ objekt }) => (
          <Objekt objekt={objekt}>
            <Overlay
              objekt={objekt}
              authenticated={authenticated}
              objektList={list}
            />
          </Objekt>
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
      <h3 className="text-xl font-cosmo drop-shadow-lg">{objektList.name}</h3>

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

const Overlay = memo(function Overlay({
  objekt,
  authenticated,
  objektList,
}: OverlayProps) {
  return (
    <Fragment>
      <ObjektSidebar collection={objekt.collectionNo} />
      {authenticated && <ListOverlay objekt={objekt} objektList={objektList} />}
    </Fragment>
  );
});
