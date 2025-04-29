"use client";

import { createContext, useContext, useTransition } from "react";
import { useCosmoArtists } from "./use-cosmo-artist";
import { setSelectedArtist } from "@/components/navbar/actions";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";

type SelectedArtistsContext = {
  selectedArtists: CosmoArtistWithMembersBFF[];
  selectedIds: string[];
};

const SelectedArtistsContext = createContext<SelectedArtistsContext>({
  selectedArtists: [],
  selectedIds: [],
});

type SelectedArtistsProviderProps = {
  children: React.ReactNode;
  selected: string[];
};

export function SelectedArtistsProvider(props: SelectedArtistsProviderProps) {
  const { artists } = useCosmoArtists();

  const selectedArtists =
    props.selected.length > 0
      ? artists.filter((a) => props.selected.includes(a.id))
      : artists;

  return (
    <SelectedArtistsContext.Provider
      value={{
        selectedArtists,
        selectedIds: props.selected,
      }}
    >
      {props.children}
    </SelectedArtistsContext.Provider>
  );
}

/**
 * Get the current selected artists.
 */
export function useSelectedArtists() {
  const ctx = useContext(SelectedArtistsContext);

  if (!ctx) {
    throw new Error(
      "useSelectedArtists must be used within a SelectedArtistsProvider"
    );
  }

  return ctx;
}

/**
 * Update the selected artists.
 */
export function useUpdateSelectedArtists() {
  const [isPending, startTransition] = useTransition();

  function handleSelect(artistId: string) {
    startTransition(async () => {
      await setSelectedArtist(artistId);
    });
  }

  return {
    handleSelect,
    isPending,
  };
}
