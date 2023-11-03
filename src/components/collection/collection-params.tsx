"use client";

import { CosmoArtistWithMembers } from "@/lib/server/cosmo";
import CollectionRenderer from "./collection-renderer";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Route } from "next";
import {
  ValidKey,
  toSearchParams,
  useTypedSearchParams,
} from "@/hooks/use-typed-search-params";
import { z } from "zod";
import {
  validArtists,
  validClasses,
  validOnlineTypes,
  validSeasons,
  validSorts,
} from "@/lib/server/cosmo";

export const collectionFilters = z.object({
  show_locked: z.boolean().optional(),
  start_after: z.number(),
  member: z.string().optional(),
  artist: z.enum(validArtists).optional(),
  sort: z.enum(validSorts),
  class: z.enum(validClasses).array().optional(),
  on_offline: z.enum(validOnlineTypes).array().optional(),
  season: z.enum(validSeasons).array().optional(),
  transferable: z.boolean().optional(),
  gridable: z.boolean().optional(),
  used_for_grid: z.boolean().optional(),
  collection: z.string().optional(),
});

export type CollectionFilters = z.infer<typeof collectionFilters>;

type Props = {
  locked: number[];
  artists: CosmoArtistWithMembers[];
  nickname?: string;
  address: string;
};

export default function CollectionParams(props: Props) {
  const params = useTypedSearchParams(collectionFilters, (params) => {
    if (!params.has("start_after")) {
      params.set("start_after", "0");
    }
    if (!params.has("sort")) {
      params.set("sort", "newest");
    }
    return params;
  });
  const [showLocked, setShowLocked] = useState(
    params.success ? params.data.show_locked ?? true : true
  );
  const [filters, setFilters] = useState<CollectionFilters>(
    params.success
      ? params.data
      : {
          show_locked: true,
          start_after: 0,
          sort: "newest",
        }
  );

  // update the URL with filters upon change
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    let exclude: ValidKey<typeof collectionFilters>[] = ["start_after"];

    // default, no need to litter the URL
    if (filters.sort === "newest") {
      exclude.push("sort");
    }
    if (showLocked === true) {
      exclude.push("show_locked");
    }

    const parsed = toSearchParams(filters, false, exclude);

    // handle locking state
    if (showLocked === false) {
      parsed.set("show_locked", "false");
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
