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
import CollectionObjektDisplay from "./collection-objekt-display";
import { TokenPayload } from "@/lib/universal/auth";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import HelpDialog from "../profile/help-dialog";
import PolygonButton from "../profile/polygon-button";
import OpenSeaButton from "../profile/opensea-button";
import TradesButton from "../profile/trades-button";
import CopyAddressButton from "../profile/copy-address-button";
import BackButton from "../profile/back-button";
import { CosmoFilters, useCosmoFilters } from "@/hooks/use-cosmo-filters";

export type PropsWithFilters<T extends keyof CosmoFilters> = {
  filters: CosmoFilters[T];
  setFilters: (filters: CosmoFilters[T]) => void;
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

  async function queryFunction({
    pageParam = 0,
  }: {
    pageParam?: string | number;
  }) {
    const query = new URLSearchParams(searchParams);
    query.set("start_after", pageParam.toString());

    const result = await fetch(
      `${COSMO_ENDPOINT}/objekt/v1/owned-by/${user.address}?${query.toString()}`
    );
    return (await result.json()) as OwnedObjektsResult;
  }

  return (
    <>
      <div className="flex flex-col sm:gap-2 group" data-show={showFilters}>
        {/* header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 pb-2">
          {/* title */}
          <div className="flex gap-2 justify-between items-center w-full md:w-auto">
            <div className="flex gap-2 items-center">
              <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
                Collect
              </h1>

              <HelpDialog />
            </div>

            <div id="objekt-total" />
          </div>

          {/* desktop: options */}
          <div className="hidden sm:flex items-center gap-2">
            <PolygonButton address={user.address} />
            <OpenSeaButton address={user.address} />
            <BackButton url={`/@${user.nickname}`} tooltip="View Profile" />
            <TradesButton nickname={isAddress ? user.address : user.nickname} />
            <CopyAddressButton address={user.address} />
          </div>

          {/* mobile: options */}
          <div className="flex sm:hidden justify-center items-center gap-2">
            {/* show filters */}
            <Toggle
              variant="secondary"
              size="sm"
              pressed={showFilters}
              onPressedChange={setShowFilters}
            >
              <SlidersHorizontal className="mr-2" />
              <span>Filters</span>
            </Toggle>

            <TradesButton nickname={isAddress ? user.address : user.nickname} />
            <BackButton url={`/@${user.nickname}`} tooltip="View Profile" />
          </div>
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-fit sm:group-data-[show=true]:h-fit group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
          <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />
          <GridableFilter
            filters={cosmoFilters.gridable}
            setFilters={(f) => updateCosmoFilters("gridable", f)}
          />
          <TransferableFilter
            filters={cosmoFilters.transferable}
            setFilters={(f) => updateCosmoFilters("transferable", f)}
          />
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

      <CollectionObjektDisplay
        authenticated={true}
        address={user.address}
        lockedTokenIds={lockedObjekts}
        showLocked={showLocked}
        artists={artists}
        filters={cosmoFilters}
        setFilters={setCosmoFilters}
        queryFunction={queryFunction}
      />
    </>
  );
}
