"use client";

import { Send, SlidersHorizontal } from "lucide-react";
import { ClassFilter } from "./filter-class";
import { OnlineFilter } from "./filter-online";
import { SeasonFilter } from "./filter-season";
import { TransferableFilter } from "./filter-transferable";
import { GridableFilter } from "./filter-gridable";
import { LockedFilter } from "./filter-locked";
import { SortFilter } from "./filter-sort";
import { Toggle } from "../ui/toggle";
import HelpDialog from "./help-dialog";
import OpenSeaButton from "./options/opensea-button";
import PolygonButton from "./options/polygon-button";
import MobileOptions from "./options/mobile-options";
import CopyAddressButton from "./options/copy-address-button";
import {
  CollectionFilters,
  collectionFilters,
  useCollectionFilters,
} from "@/hooks/use-collection-filters";
import CollectionObjektDisplay from "./collection-objekt-display";
import { ObjektList } from "@/lib/universal/objekts";
import ListDropdown from "../lists/list-dropdown";
import { TokenPayload } from "@/lib/universal/auth";
import { toSearchParams } from "@/hooks/use-typed-search-params";
import { useState } from "react";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import { Button } from "../ui/button";
import Link from "next/link";
import TradesButton from "./options/trades-button";

export type PropsWithFilters<T extends keyof CollectionFilters> = {
  filters: CollectionFilters[T];
  setFilters: (filters: CollectionFilters[T]) => void;
};

type Props = {
  locked: number[];
  artists: CosmoArtistWithMembers[];
  nickname?: string;
  address: string;
  lists: ObjektList[];
  currentUser?: TokenPayload;
};

export default function CollectionRenderer({
  locked,
  artists,
  nickname,
  address,
  lists,
  currentUser,
}: Props) {
  const [total, setTotal] = useState<number>();
  const [
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    updateFilter,
    showLocked,
    setShowLocked,
  ] = useCollectionFilters();

  async function fetcher({ pageParam = 0 }) {
    const searchParams = toSearchParams<typeof collectionFilters>(
      filters,
      true,
      ["show_locked"]
    );
    searchParams.set("start_after", pageParam.toString());

    const result = await fetch(
      `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}?${searchParams.toString()}`
    );
    const page: OwnedObjektsResult = await result.json();
    setTotal(page.total);
    return page;
  }

  return (
    <>
      <div className="flex flex-col sm:gap-2 group" data-show={showFilters}>
        {/* header */}
        <div className="flex flex-col md:flex-row items-center justify-between pb-2 sm:pb-0">
          {/* title */}
          <div className="flex gap-2 justify-between items-center w-full md:w-auto">
            <div className="flex gap-2 items-center">
              <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
                {nickname ?? "Collect"}
              </h1>

              <HelpDialog />
            </div>

            {total !== undefined && (
              <p className="font-semibold">{total} total</p>
            )}
          </div>

          {/* desktop: options */}
          <div className="hidden sm:flex items-center gap-2">
            <CopyAddressButton address={address} />
            <PolygonButton address={address} />
            <OpenSeaButton address={address} />
            {nickname && (
              <ListDropdown
                lists={lists}
                nickname={nickname}
                allowCreate={currentUser?.nickname === nickname}
              />
            )}
            <TradesButton nickname={nickname ?? currentUser?.nickname} />
          </div>

          {/* mobile: options */}
          <div className="flex sm:hidden justify-center items-center gap-2">
            {/* show filters */}
            <Toggle
              variant="outline"
              size="sm"
              pressed={showFilters}
              onPressedChange={setShowFilters}
            >
              <SlidersHorizontal className="drop-shadow-lg" />
            </Toggle>

            {nickname && (
              <ListDropdown
                lists={lists}
                nickname={nickname}
                allowCreate={currentUser?.nickname === nickname}
              />
            )}

            <TradesButton nickname={nickname ?? currentUser?.nickname} />

            <MobileOptions address={address} />
          </div>
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-fit sm:group-data-[show=true]:h-fit group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />
          <GridableFilter
            filters={filters.gridable}
            setFilters={(f) => updateFilter("gridable", f)}
          />
          <TransferableFilter
            filters={filters.transferable}
            setFilters={(f) => updateFilter("transferable", f)}
          />
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

      <CollectionObjektDisplay
        authenticated={nickname === undefined}
        address={address}
        lockedTokenIds={locked}
        showLocked={showLocked}
        artists={artists}
        filters={filters}
        setFilters={setFilters}
        queryFunction={fetcher}
      />
    </>
  );
}
