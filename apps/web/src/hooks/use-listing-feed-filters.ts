import type {
  CosmoFilters,
  PropsWithFilters,
  SetCosmoFilters,
} from "@/hooks/use-cosmo-filters";
import {
  countActiveListingFilters,
  type ListingFeedSearch,
} from "@/lib/universal/parsers";
import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/market/");

/**
 * The search keys one side of the feed's filters writes to.
 */
type SideKeys = {
  season: "season" | "want_season";
  member: "member" | "want_member";
  class: "class" | "want_class";
  on_offline: "on_offline" | "want_on_offline";
  artist: "artist" | "want_artist";
};

export const offeringKeys = {
  season: "season",
  member: "member",
  class: "class",
  on_offline: "on_offline",
  artist: "artist",
} satisfies SideKeys;

export const wantKeys = {
  season: "want_season",
  member: "want_member",
  class: "want_class",
  on_offline: "want_on_offline",
  artist: "want_artist",
} satisfies SideKeys;

function readSide(keys: SideKeys, search: ListingFeedSearch): CosmoFilters {
  return {
    season: search[keys.season],
    member: search[keys.member],
    class: search[keys.class],
    on_offline: search[keys.on_offline],
    artist: search[keys.artist],
  };
}

/**
 * The search params a chip's update writes. Only the keys the update names
 * change, so clearing one column leaves the others alone; a cleared column
 * is undefined, which leaves the URL rather than reading `null` there.
 */
function writeSide(keys: SideKeys, input: Partial<CosmoFilters>) {
  const search: ListingFeedSearch = {};
  if ("season" in input) search[keys.season] = input.season ?? undefined;
  if ("member" in input) search[keys.member] = input.member ?? undefined;
  if ("class" in input) search[keys.class] = input.class ?? undefined;
  if ("on_offline" in input) {
    search[keys.on_offline] = input.on_offline ?? undefined;
  }
  if ("artist" in input) search[keys.artist] = input.artist ?? undefined;
  return search;
}

/**
 * One side of the feed's filters in the shape the objekt filter chips take,
 * so the same chips drive the Offering keys and the `want_` keys.
 */
export function useFeedSideFilters(keys: SideKeys): PropsWithFilters {
  const navigate = route.useNavigate();
  const filters = route.useSearch({
    structuralSharing: true,
    select: (search) => readSide(keys, search),
  });

  const setFilters: SetCosmoFilters = (input) => {
    const update = input instanceof Function ? input(filters) : input;
    void navigate({
      search: (prev) => ({ ...prev, ...writeSide(keys, update) }),
      replace: true,
    });
  };

  return { filters, setFilters };
}

/**
 * How many filter columns narrow either side of the feed, and a reset that
 * clears them.
 */
export function useListingFeedFilters() {
  const navigate = route.useNavigate();
  const search = route.useSearch();

  function reset() {
    void navigate({ search: {}, replace: true });
  }

  return {
    count: countActiveListingFilters(search),
    reset,
  };
}
