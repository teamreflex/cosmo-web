import { baseUrl } from "@/lib/utils";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";

export const filterDataQuery = queryOptions({
  queryKey: ["filter-data"],
  queryFn: async () => {
    const url = new URL("/api/filter-data", baseUrl());
    return await ofetch<FilterData>(url.toString());
  },
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});

export function useFilterData() {
  const { data } = useSuspenseQuery(filterDataQuery);
  return data;
}

export type FilterData = {
  collections: string[];
  seasons: SeasonFilterData[];
  classes: ClassFilterData[];
};

export type SeasonFilterData = {
  artistId: string;
  seasons: string[];
};

export type ClassFilterData = {
  artistId: string;
  classes: string[];
};
