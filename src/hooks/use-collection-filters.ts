import {
  validArtists,
  validClasses,
  validOnlineTypes,
  validSeasons,
  validSorts,
} from "@/lib/universal/cosmo/common";
import * as z from "zod";
import {
  ValidKey,
  toSearchParams,
  useTypedSearchParams,
} from "./use-typed-search-params";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  // grid param: "Atom01 JinSoul 101Z"
  collection: z.string().optional(),
  // index param: ["101Z", "102Z"]
  collectionNo: z.string().array().optional(),
});

export type CollectionFilters = z.infer<typeof collectionFilters>;

export function useCollectionFilters() {
  console.log("[update]: useCollectionFilters");
  // get and parse params from URL
  const params = useTypedSearchParams(collectionFilters, (params) => {
    if (!params.has("start_after")) {
      params.set("start_after", "0");
    }
    if (!params.has("sort")) {
      params.set("sort", "newest");
    }
    return params;
  });

  // mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);

  // use separate state for apollo features so a refetch doesn't occur
  const [showLocked, setShowLocked] = useState(
    params.success ? params.data.show_locked ?? true : true
  );

  // setup cosmo filters
  const [filters, setFilters] = useState<CollectionFilters>(
    params.success
      ? params.data
      : {
          show_locked: true,
          start_after: 0,
          sort: "newest",
        }
  );

  // type-safe filter update function
  function updateFilter<T extends keyof CollectionFilters>(
    key: T,
    value: CollectionFilters[T]
  ) {
    setFilters((filters) => ({
      ...filters,
      [key]: value,
    }));
  }

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

    router.replace(`${pathname}?${parsed.toString()}`);
  }, [filters, pathname, router, showLocked]);

  return [
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    updateFilter,
    showLocked,
    setShowLocked,
  ] as const;
}
