"use client";

import ObjektList from "@/components/collection/objekt-list";
import { SlidersHorizontal } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { ClassFilter } from "./filter-class";
import { OnlineFilter } from "./filter-online";
import { SeasonFilter } from "./filter-season";
import { TransferableFilter } from "./filter-transferable";
import { GridableFilter } from "./filter-gridable";
import { LockedFilter } from "./filter-locked";
import { SortFilter } from "./filter-sort";
import { Toggle } from "../ui/toggle";
import HelpDialog from "./help-dialog";
import { CollectionFilters } from "./collection-params";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo";
import OpenSeaButton from "./options/opensea-button";
import PolygonButton from "./options/polygon-button";
import MobileOptions from "./options/mobile-options";
import CopyAddressButton from "./options/copy-address-button";

export type PropsWithFilters<T extends keyof CollectionFilters> = {
  filters: CollectionFilters[T];
  setFilters: (filters: CollectionFilters[T]) => void;
};

type Props = {
  locked: number[];
  artists: CosmoArtistWithMembers[];
  nickname?: string;
  address: string;
  filters: CollectionFilters;
  setFilters: Dispatch<SetStateAction<CollectionFilters>>;
  showLocked: boolean;
  setShowLocked: (state: boolean) => void;
};

export default function CollectionRenderer({
  locked,
  artists,
  nickname,
  address,
  filters,
  setFilters,
  showLocked,
  setShowLocked,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  function updateFilter<T extends keyof CollectionFilters>(
    key: T,
    value: CollectionFilters[T]
  ) {
    setFilters((filters) => ({
      ...filters,
      [key]: value,
    }));
  }

  return (
    <>
      <div className="flex flex-col sm:gap-2 group" data-show={showFilters}>
        {/* header */}
        <div className="flex items-center justify-between pb-2 sm:pb-0">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
              {nickname ?? "Collect"}
            </h1>
            <HelpDialog />
          </div>

          {/* desktop: options */}
          <div className="hidden sm:flex items-center gap-2">
            <CopyAddressButton address={address} />
            <PolygonButton address={address} />
            <OpenSeaButton address={address} />
          </div>

          {/* mobile: options */}
          <div className="flex sm:hidden items-center gap-2">
            {/* show filters */}
            <Toggle pressed={showFilters} onPressedChange={setShowFilters}>
              <SlidersHorizontal className="drop-shadow-lg" />
            </Toggle>

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

      <ObjektList
        authenticated={nickname === undefined}
        address={address}
        lockedTokenIds={locked}
        showLocked={showLocked}
        artists={artists}
        filters={filters}
        setFilters={setFilters}
      />
    </>
  );
}
