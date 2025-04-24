"use client";

import { createContext, useContext } from "react";

const SelectedArtistsContext = createContext<string[]>([]);

type SelectedArtistsProviderProps = {
  children: React.ReactNode;
  selectedArtists: string[];
};

export function SelectedArtistsProvider({
  children,
  selectedArtists,
}: SelectedArtistsProviderProps) {
  return (
    <SelectedArtistsContext.Provider value={selectedArtists}>
      {children}
    </SelectedArtistsContext.Provider>
  );
}

export function useSelectedArtists() {
  return useContext(SelectedArtistsContext);
}
