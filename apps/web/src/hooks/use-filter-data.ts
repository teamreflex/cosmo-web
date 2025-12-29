import { filterDataQuery } from "@/lib/queries/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useArtists } from "./use-artists";

export function useFilterData() {
  const { data } = useSuspenseQuery(filterDataQuery);
  const { getArtist, selectedIds } = useArtists();

  const seasonsData = data.seasons
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
    })
    .sort((a, b) => a.artist.comoTokenId - b.artist.comoTokenId);

  const classesData = data.classes
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
    })
    .sort((a, b) => a.artist.comoTokenId - b.artist.comoTokenId);

  return {
    collections: data.collections,
    seasons: seasonsData,
    classes: classesData,
  };
}

/**
 * Convert a list of seasons to a list of season keys and names.
 */
export function getSeasonKeys(seasons: string[]) {
  return seasons.map((season) => {
    const match = season.match(/^([a-zA-Z]+)/);
    if (!match || !match[1]) {
      return {
        key: season,
        name: season,
      };
    }

    return {
      key: match[1].toLowerCase(),
      name: season,
    };
  });
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
