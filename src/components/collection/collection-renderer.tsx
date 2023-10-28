"use client";

import { CosmoArtistWithMembers, ObjektQueryParams } from "@/lib/server/cosmo";
import ObjektList from "@/components/collection/objekt-list";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { ClassFilter } from "./filter-class";
import { OnlineFilter } from "./filter-online";
import { SeasonFilter } from "./filter-season";
import { TransferableFilter } from "./filter-transferable";
import { GridableFilter } from "./filter-gridable";
import { LockedFilter } from "./filter-locked";
import { SortFilter } from "./filter-sort";
import { Toggle } from "../ui/toggle";
import HelpDialog from "./help-dialog";

export type PropsWithFilters<T extends keyof ObjektQueryParams> = {
  filters: ObjektQueryParams[T];
  setFilters: (filters: ObjektQueryParams[T]) => void;
};

type Props = {
  locked: number[];
  artists: CosmoArtistWithMembers[];
  nickname?: string;
  address: string;
};

export default function CollectionRenderer({
  locked,
  artists,
  nickname,
  address,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  // make showLocked a separate filter so it doesn't trigger a re-fetch
  const [showLocked, setShowLocked] = useState(true);
  const [filters, setFilters] = useState<ObjektQueryParams>({
    startAfter: 0,
    sort: "newest",
    artist: undefined,
    member: undefined,
    classType: undefined,
    onlineType: undefined,
    transferable: undefined,
    gridable: undefined,
    usedForGrid: undefined,
    collection: undefined,
  });

  function updateFilter<T extends keyof ObjektQueryParams>(
    key: T,
    value: ObjektQueryParams[T]
  ) {
    setFilters((filters) => ({
      ...filters,
      [key]: value,
    }));
  }

  return (
    <>
      <div
        className="flex flex-col sm:flex-row justify-between group"
        data-show={showFilters}
      >
        {/* header */}
        <div className="flex items-center justify-between pb-2 sm:pb-0">
          {/* title */}
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">
              {nickname ?? "Collect"}
            </h1>
            <HelpDialog />
          </div>

          {/* mobile: show filters */}
          <div className="flex sm:hidden items-center">
            <Toggle
              size="sm"
              pressed={showFilters}
              onPressedChange={setShowFilters}
            >
              <SlidersHorizontal className="w-4 h-4 drop-shadow-lg" />
            </Toggle>
          </div>
        </div>

        {/* filters */}
        <div className="transition-all flex sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100 group-data-[show=true]:pb-2 sm:pb-1 sm:group-data-[show=false]:h-12 sm:group-data-[show=true]:h-12 group-data-[show=false]:h-0 group-data-[show=false]:invisible group-data-[show=false]:opacity-0 group-data-[show=true]:h-36 gap-2 items-center flex-wrap justify-center">
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
            filters={filters.onlineType}
            setFilters={(f) => updateFilter("onlineType", f)}
          />
          <ClassFilter
            filters={filters.classType}
            setFilters={(f) => updateFilter("classType", f)}
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
