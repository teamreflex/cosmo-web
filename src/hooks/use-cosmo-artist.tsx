"use client";

import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { ReactNode, createContext, useCallback, useContext } from "react";

type ContextProps = {
  artists: Map<string, CosmoArtistWithMembersBFF>;
};

const CosmoArtistContext = createContext<ContextProps | null>(null);

type ProviderProps = {
  children: ReactNode;
  artists: CosmoArtistWithMembersBFF[];
};

export function CosmoArtistProvider({ children, artists }: ProviderProps) {
  const artistMap = new Map(
    artists.map((artist) => [artist.id.toLowerCase(), artist])
  );

  return (
    <CosmoArtistContext.Provider value={{ artists: artistMap }}>
      {children}
    </CosmoArtistContext.Provider>
  );
}

/**
 * Provides a way to pull an artist and its contracts deep in the tree.
 * Necessary due to /bff/v1/collection-group not including the tokenAddress property.
 */
export function useCosmoArtist() {
  const ctx = useContext(CosmoArtistContext);
  if (ctx === null) {
    throw new Error("useCosmoArtist must be used within a CosmoArtistProvider");
  }

  const getArtist = useCallback(
    (artistName: string) => ctx.artists.get(artistName.toLowerCase()),
    [ctx.artists]
  );

  return { getArtist };
}
