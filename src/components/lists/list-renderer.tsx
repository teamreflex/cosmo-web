"use client";

import { Toggle } from "../ui/toggle";
import { SlidersHorizontal } from "lucide-react";
import {
  IndexedCosmoResponse,
  IndexedObjekt,
  ObjektList,
} from "@/lib/universal/objekts";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import ListOverlay from "./list-overlay";
import DeleteList from "./delete-list";
import UpdateList from "./update-list";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { SearchUser } from "@/lib/universal/cosmo/auth";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Fragment, useCallback } from "react";
import {
  FiltersContainer,
  IndexFilters,
} from "../collection/filters-container";

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
    showFilters,
    setShowFilters,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] = useCosmoFilters();

  const queryFunction = useCallback(
    async ({ pageParam = 0 }: { pageParam?: string | number }) => {
      const query = new URLSearchParams(searchParams);
      query.set("page", pageParam.toString());
      query.set("list", list.slug);
      query.set("address", user.address);

      const result = await fetch(`/api/objekts?${query.toString()}`);
      return (await result.json()) as IndexedCosmoResponse;
    },
    [searchParams, list.slug, user.address]
  );

  return (
    <section className="flex flex-col">
      <div className="flex flex-col group" data-show={showFilters}>
        {/* list info */}
        <div className="flex flex-wrap items-center justify-between pb-2 gap-2">
          <h3 className="text-xl font-cosmo drop-shadow-lg">{list.name}</h3>

          <div className="flex items-center gap-2">
            {/* list-related */}
            {authenticated && (
              <>
                <UpdateList list={list} />
                <DeleteList list={list} />
              </>
            )}

            {/* mobile: filters */}
            <Toggle
              variant="secondary"
              size="sm"
              pressed={showFilters}
              onPressedChange={setShowFilters}
              className="sm:hidden"
            >
              <SlidersHorizontal />
            </Toggle>
          </div>
        </div>

        {/* filters */}
        <FiltersContainer>
          <IndexFilters
            cosmoFilters={cosmoFilters}
            updateCosmoFilters={updateCosmoFilters}
            collections={[]}
          />
        </FiltersContainer>
      </div>

      <FilteredObjektDisplay
        artists={artists}
        filters={cosmoFilters}
        setFilters={setCosmoFilters}
        authenticated={authenticated}
        queryFunction={queryFunction}
        queryKey={["objekt-list", list.slug]}
        getObjektId={(objekt: IndexedObjekt) => objekt.id}
        getObjektDisplay={() => true}
        objektSlot={
          <Fragment>
            <ObjektSidebar />
            {authenticated && <ListOverlay list={list} />}
          </Fragment>
        }
      />
    </section>
  );
}
