import { useSuspenseQuery } from "@tanstack/react-query";
import { useArtists } from "./use-artists";
import { filterDataQuery } from "@/lib/queries/core";

export function useFilterData() {
  const { data } = useSuspenseQuery(filterDataQuery);
  const { getArtist, selectedIds } = useArtists();

  const seasons = data.seasons
    .map(({ artistId, seasons }) => {
      const artist = getArtist(artistId)!;
      return {
        artist,
        seasons,
      };
    })
    .filter(({ artist }) => {
      if (selectedIds.length === 0) return true;
      return selectedIds.includes(artist.id);
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
      if (selectedIds.length === 0) return true;
      return selectedIds.includes(artist.id);
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
