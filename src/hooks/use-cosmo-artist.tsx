"use client";

import {
  CosmoArtistWithMembersBFF,
  CosmoMemberBFF,
} from "@/lib/universal/cosmo/artists";
import { ReactNode, createContext, useCallback, useContext } from "react";

type ContextProps = {
  artists: CosmoArtistWithMembersBFF[];
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  memberMap: Map<string, CosmoMemberBFF>;
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

  const memberMap = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member])
    )
  );

  return (
    <CosmoArtistContext.Provider value={{ artists, artistMap, memberMap }}>
      {children}
    </CosmoArtistContext.Provider>
  );
}

/**
 * Provides a way to pull an artist and its contracts/members deep in the component tree.
 * Necessary due to:
 * - /bff/v1/collection-group not including the tokenAddress property.
 * - /bff/v1/collection-group using memberIds for filtering instead of member names.
 */
export function useCosmoArtists() {
  const ctx = useContext(CosmoArtistContext);
  if (ctx === null) {
    throw new Error("useCosmoArtist must be used within a CosmoArtistProvider");
  }

  /**
   * Get an artist by name
   */
  const getArtist = useCallback(
    (artistName: string) => ctx.artistMap.get(artistName.toLowerCase()),
    [ctx.artistMap]
  );

  /**
   * Get a member by name
   */
  const getMember = useCallback(
    (memberName: string) => ctx.memberMap.get(memberName.toLowerCase()),
    [ctx.memberMap]
  );

  return { artists: ctx.artists, getArtist, getMember };
}
