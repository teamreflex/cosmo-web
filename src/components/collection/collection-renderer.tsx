"use client";

import { SlidersHorizontal } from "lucide-react";
import { ClassFilter } from "./filter-class";
import { OnlineFilter } from "./filter-online";
import { SeasonFilter } from "./filter-season";
import { TransferableFilter } from "./filter-transferable";
import { GridableFilter } from "./filter-gridable";
import { LockedFilter } from "./filter-locked";
import { SortFilter } from "./filter-sort";
import { Toggle } from "../ui/toggle";
import {
  CollectionFilters,
  collectionFilters,
  useCollectionFilters,
} from "@/hooks/use-collection-filters";
import CollectionObjektDisplay from "./collection-objekt-display";
import { TokenPayload } from "@/lib/universal/auth";
import { toSearchParams } from "@/hooks/use-typed-search-params";
import { useState } from "react";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import HelpDialog from "../profile/help-dialog";
import PolygonButton from "../profile/polygon-button";
import OpenSeaButton from "../profile/opensea-button";
import TradesButton from "../profile/trades-button";
import CopyAddressButton from "../profile/copy-address-button";
import BackButton from "../profile/back-button";

export type PropsWithFilters<T extends keyof CollectionFilters> = {
  filters: CollectionFilters[T];
  setFilters: (filters: CollectionFilters[T]) => void;
};

type Props = {
  lockedObjekts: number[];
  artists: CosmoArtistWithMembers[];
  isAddress: boolean;
  user: TokenPayload;
};

export default function CollectionRenderer({
  lockedObjekts,
  artists,
  isAddress,
  user,
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

  async function fetcher({ pageParam = 0 }: { pageParam?: string | number }) {
    const searchParams = toSearchParams<typeof collectionFilters>(
      filters,
      true,
      ["show_locked"]
    );
    searchParams.set("start_after", pageParam.toString());

    const result = await fetch(
      `${COSMO_ENDPOINT}/objekt/v1/owned-by/${
        user.address
      }?${searchParams.toString()}`
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
                Collect
              </h1>

              <HelpDialog />
            </div>

            {total !== undefined && (
              <p className="font-semibold">{total} total</p>
            )}
          </div>

          {/* desktop: options */}
          <div className="hidden sm:flex items-center gap-2">
            <PolygonButton address={user.address} />
            <OpenSeaButton address={user.address} />
            <BackButton url={`/@${user.nickname}`} tooltip="View profile" />
            <TradesButton nickname={isAddress ? user.address : user.nickname} />
            <CopyAddressButton address={user.address} />
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

            <TradesButton nickname={isAddress ? user.address : user.nickname} />
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
        authenticated={true}
        address={user.address}
        lockedTokenIds={lockedObjekts}
        showLocked={showLocked}
        artists={artists}
        filters={filters}
        setFilters={setFilters}
        queryFunction={fetcher}
      />
    </>
  );
}
