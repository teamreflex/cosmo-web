import { filterDataQuery } from "@/lib/queries/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useArtists } from "./use-artists";

type Options = {
  /**
   * Lists every artist's values rather than only the navbar's selection.
   */
  allArtists?: boolean;
};

export function useFilterData({ allArtists = false }: Options = {}) {
  const { data } = useSuspenseQuery(filterDataQuery);
  const { artistList, selected } = useArtists();
  const shown = allArtists ? artistList : selected;

  return {
    collections: data.collections,
    // the indexer names an artist by its lowercased id
    seasons: shown.flatMap((artist) =>
      data.seasons
        .filter(({ artistId }) => artistId === artist.id.toLowerCase())
        .map(({ seasons }) => ({ artist, seasons })),
    ),
    classes: shown.flatMap((artist) =>
      data.classes
        .filter(({ artistId }) => artistId === artist.id.toLowerCase())
        .map(({ classes }) => ({ artist, classes })),
    ),
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
