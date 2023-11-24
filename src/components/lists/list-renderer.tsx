"use client";

import {
  collectionFilters,
  useCollectionFilters,
} from "@/hooks/use-collection-filters";
import { CosmoArtistWithMembers, SearchUser } from "@/lib/universal/cosmo";
import { Toggle } from "../ui/toggle";
import { SlidersHorizontal, User } from "lucide-react";
import { SeasonFilter } from "../collection/filter-season";
import { OnlineFilter } from "../collection/filter-online";
import { ClassFilter } from "../collection/filter-class";
import { SortFilter } from "../collection/filter-sort";
import {
  IndexedCosmoResponse,
  IndexedObjekt,
  ObjektList,
} from "@/lib/universal/objekt-index";
import { toSearchParams } from "@/hooks/use-typed-search-params";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import ObjektSidebar from "../objekt/objekt-sidebar";
import ListOverlay from "./list-overlay";
import DeleteList from "./delete-list";
import UpdateList from "./update-list";
import { Button } from "../ui/button";
import Link from "next/link";
import { Route } from "next";

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
  const [showFilters, setShowFilters, filters, setFilters, updateFilter] =
    useCollectionFilters();

  async function fetcher({ pageParam = 0 }) {
    const searchParams = toSearchParams<typeof collectionFilters>(
      filters,
      false
    );
    searchParams.set("page", pageParam.toString());
    searchParams.set("list", list.slug);
    searchParams.set("address", user.address);

    const result = await fetch(`/api/objekts?${searchParams.toString()}`);
    return (await result.json()) as IndexedCosmoResponse;
  }

  return (
    <main className="container flex flex-col py-2">
      <div className="flex flex-col group" data-show={showFilters}>
        {/* header */}
        <div className="flex items-center justify-between gap-2">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
              {user.nickname}
            </h1>
          </div>

          {/* options */}
          <div className="flex gap-2 items-center">
            {/* profile link */}
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/@${user.nickname}` as Route}
                className="flex items-center"
              >
                <User />
                <span className="ml-2 hidden sm:block">View Profile</span>
              </Link>
            </Button>

            {/* list-related */}
            {authenticated && (
              <>
                <UpdateList list={list} />
                <DeleteList list={list} />
              </>
            )}

            {/* mobile: filters */}
            <Toggle
              pressed={showFilters}
              onPressedChange={setShowFilters}
              className="block sm:hidden"
            >
              <SlidersHorizontal className="drop-shadow-lg" />
            </Toggle>
          </div>
        </div>

        {/* list info */}
        <div className="flex items-center justify-between pb-2 sm:pb-0 gap-2">
          <h3 className="text-xl font-cosmo drop-shadow-lg">
            LIST: {list.name}
          </h3>
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-fit sm:group-data-[show=true]:h-fit group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-24 gap-2 items-center flex-wrap justify-center">
          <SeasonFilter
            filters={filters.season}
            setFilters={(f) => updateFilter("season", f)}
          />
          <OnlineFilter
            filters={filters.on_offline}
            setFilters={(f) => updateFilter("on_offline", f)}
          />
          <ClassFilter
            filters={filters.class}
            setFilters={(f) => updateFilter("class", f)}
          />
          <SortFilter
            filters={filters.sort}
            setFilters={(f) => updateFilter("sort", f)}
          />
        </div>
      </div>

      <FilteredObjektDisplay
        artists={artists}
        filters={filters}
        setFilters={setFilters}
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
    </main>
  );
}
