"use client";

import { CosmoArtistWithMembers, ObjektQueryParams } from "@/lib/server/cosmo";
import CollectionRenderer from "./collection-renderer";
import { useEffect, useState } from "react";
import {
  MapMode,
  QueryParamsKey,
  parseCollectionParams,
  validateCollectionParams,
} from "@/lib/universal";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Route } from "next";

type Props = {
  locked: number[];
  artists: CosmoArtistWithMembers[];
  nickname?: string;
  address: string;
  filterMode: MapMode;
};

export default function CollectionParams(props: Props) {
  const params = useSearchParams();
  const [filters, setFilters] = useState(validateCollectionParams(params));
  const [showLocked, setShowLocked] = useState(filters.showLocked === false);

  // update the URL with filters upon change
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    let exclude: QueryParamsKey[] = ["startAfter", "nextStartAfter"];
    // default, no need to litter the URL
    if (filters.sort === "newest") {
      exclude.push("sort");
    }

    const parsed = parseCollectionParams(filters, "apollo", exclude);
    if (showLocked === false) {
      parsed.set("showLocked", "false");
    }

    router.replace(`${pathname}?${parsed.toString()}` as Route);
  }, [filters, pathname, router, showLocked]);

  return (
    <CollectionRenderer
      {...props}
      filters={filters}
      setFilters={setFilters}
      showLocked={showLocked}
      setShowLocked={setShowLocked}
    />
  );
}
