"use client";

import { Toggle } from "../ui/toggle";
import { SlidersHorizontal } from "lucide-react";
import { SeasonFilter } from "../collection/filter-season";
import { OnlineFilter } from "../collection/filter-online";
import { ClassFilter } from "../collection/filter-class";
import { SortFilter } from "../collection/filter-sort";
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

  async function fetcher({ pageParam = 0 }: { pageParam?: string | number }) {
    const query = new URLSearchParams(searchParams);
    query.set("page", pageParam.toString());
    query.set("list", list.slug);
    query.set("address", user.address);

    const result = await fetch(`/api/objekts?${query.toString()}`);
    return (await result.json()) as IndexedCosmoResponse;
  }

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
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-fit sm:group-data-[show=true]:h-fit group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-24 gap-2 items-center flex-wrap justify-center">
          <SeasonFilter
            filters={cosmoFilters.season}
            setFilters={(f) => updateCosmoFilters("season", f)}
          />
          <OnlineFilter
            filters={cosmoFilters.on_offline}
            setFilters={(f) => updateCosmoFilters("on_offline", f)}
          />
          <ClassFilter
            filters={cosmoFilters.class}
            setFilters={(f) => updateCosmoFilters("class", f)}
          />
          <SortFilter
            filters={cosmoFilters.sort}
            setFilters={(f) => updateCosmoFilters("sort", f)}
          />
        </div>
      </div>

      <FilteredObjektDisplay
        artists={artists}
        filters={cosmoFilters}
        setFilters={setCosmoFilters}
        authenticated={authenticated}
        queryFunction={fetcher}
        queryKey={["objekt-list", list.slug]}
        getObjektId={(objekt: IndexedObjekt) => objekt.id}
        getObjektDisplay={() => true}
        objektSlot={
          <>
            <ObjektSidebar />
            {authenticated && <ListOverlay list={list} />}
          </>
        }
      />
    </section>
  );
}
