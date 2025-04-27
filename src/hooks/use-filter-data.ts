import { baseUrl } from "@/lib/utils";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { useCosmoArtists } from "./use-cosmo-artist";
import { useSelectedArtists } from "./use-selected-artists";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";

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
  const { getArtist } = useCosmoArtists();
  const selectedArtists = useSelectedArtists();

  const seasons = data.seasons
    .map(({ artistId, seasons }) => {
      const artist = getArtist(artistId)!;
      return {
        artist,
        seasons,
      };
    })
    .filter(({ artist }) => {
      if (selectedArtists.length === 0) return true;
      return selectedArtists.includes(artist.id);
    });

  const classes = data.classes
    .map(({ artistId, classes }) => {
      const artist = getArtist(artistId)!;
      return {
        artist,
        classes,
      };
    })
    .filter(({ artist }) => {
      if (selectedArtists.length === 0) return true;
      return selectedArtists.includes(artist.id);
    });

  return {
    collections: data.collections,
    seasons,
    classes,
  };
}

export type FilterData = {
  collections: string[];
  seasons: {
    artistId: string;
    seasons: string[];
  }[];
  classes: {
    artistId: string;
    classes: string[];
  }[];
};

export type SeasonFilterData = {
  artist: CosmoArtistWithMembersBFF;
  seasons: string[];
};

export type ClassFilterData = {
  artist: CosmoArtistWithMembersBFF;
  classes: string[];
};
