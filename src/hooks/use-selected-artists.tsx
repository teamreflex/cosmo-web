"use client";

import { CosmoArtistBFF } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { createContext, useContext, useState } from "react";

type SelectedArtistsContext = {
  artists: CosmoArtistBFF[];
  selectedArtists: CosmoArtistBFF[];
  selectedIds: string[];
  handleSelect: (artistId: ValidArtist) => void;
};

const SelectedArtistsContext = createContext<SelectedArtistsContext>({
  artists: [],
  selectedArtists: [],
  selectedIds: [],
  handleSelect: () => {},
});

type SelectedArtistsProviderProps = {
  children: React.ReactNode;
  artists: CosmoArtistBFF[];
  selected: string[];
};

export function SelectedArtistsProvider(props: SelectedArtistsProviderProps) {
  const [selectedIds, setSelectedIds] = useState(() => props.selected);

  function handleSelect(artistId: ValidArtist) {
    setSelectedIds((prev) => {
      if (prev.includes(artistId)) {
        return [...prev].filter((a) => a !== artistId);
      }

      return [...prev, artistId];
    });
  }

  const selectedArtists =
    selectedIds.length > 0
      ? props.artists.filter((a) => selectedIds.includes(a.id))
      : props.artists;

  return (
    <SelectedArtistsContext.Provider
      value={{
        artists: props.artists,
        selectedArtists,
        selectedIds,
        handleSelect,
      }}
    >
      {props.children}
    </SelectedArtistsContext.Provider>
  );
}

export function useSelectedArtists() {
  return useContext(SelectedArtistsContext);
}
