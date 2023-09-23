"use client";

import { CosmoArtistWithMembers, ObjektQueryParams } from "@/lib/server/cosmo";
import ObjektList from "@/components/collection/objekt-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { ClassFilter } from "./filter-class";
import { OnlineFilter } from "./filter-online";
import { SeasonFilter } from "./filter-season";
import { TransferableFilter } from "./filter-transferable";
import { GridableFilter } from "./filter-gridable";
import { LockedFilter } from "./filter-locked";

export type PropsWithFilters<T extends keyof ObjektQueryParams> = {
  filters: ObjektQueryParams[T];
  setFilters: (filters: ObjektQueryParams[T]) => void;
};

type Props = {
  locked: number[];
  artists: CosmoArtistWithMembers[];
};

export default function CollectionRenderer({ locked, artists }: Props) {
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
      <div className="flex items-center flex-col sm:flex-row sm:justify-between">
        {/* header */}
        <div className="flex gap-2 items-center pb-2 sm:pb-0">
          <h1 className="text-2xl font-cosmo uppercase">Collect</h1>
          <HelpDialog />
        </div>

        {/* filters */}
        <div className="flex gap-2 items-center flex-wrap justify-center">
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
        </div>
      </div>

      <ObjektList
        lockedTokenIds={locked}
        showLocked={showLocked}
        artists={artists}
        filters={filters}
        setFilters={setFilters}
      />
    </>
  );
}

function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Info</AlertDialogTitle>
          <AlertDialogDescription>
            Locking an objekt does not affect usage within the Cosmo app.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Understood</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
