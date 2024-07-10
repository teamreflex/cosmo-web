"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import { ReactNode, createContext, useContext, useState } from "react";

type ContextProps = {
  artist: ValidArtist;
  setArtist: (artist: ValidArtist) => void;
};

const SelectedArtistContext = createContext<ContextProps>({
  artist: "artms",
  setArtist: () => null,
});

type ProviderProps = {
  children: ReactNode;
  selectedArtist: ValidArtist;
};

export function SelectedArtistProvider({
  children,
  selectedArtist,
}: ProviderProps) {
  const [artist, setArtist] = useState(selectedArtist);

  return (
    <SelectedArtistContext.Provider value={{ artist, setArtist }}>
      {children}
    </SelectedArtistContext.Provider>
  );
}

export function useSelectedArtist() {
  const ctx = useContext(SelectedArtistContext);
  if (ctx === undefined) {
    throw new Error(
      "useSelectedArtist must be used within a SelectedArtistProvider"
    );
  }

  return ctx;
}
