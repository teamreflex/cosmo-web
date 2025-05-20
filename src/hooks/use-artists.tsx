"use client";

import type {
  CosmoArtistWithMembersBFF,
  CosmoMemberBFF,
} from "@/lib/universal/cosmo/artists";
import { type ReactNode, createContext, use, useCallback } from "react";

type ContextProps = {
  // cosmo artist data
  artists: CosmoArtistWithMembersBFF[];
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  memberMap: Map<string, CosmoMemberBFF>;
  // user selected artist data
  selected: string[];
};

const ArtistContext = createContext<ContextProps>({
  artists: [],
  artistMap: new Map(),
  memberMap: new Map(),
  selected: [],
});

type ProviderProps = {
  children: ReactNode;
  artists: CosmoArtistWithMembersBFF[];
  selected: string[];
};

export function ArtistProvider({ children, artists, selected }: ProviderProps) {
  const artistMap = new Map(
    artists.map((artist) => [artist.id.toLowerCase(), artist])
  );

  const memberMap = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member])
    )
  );

  return (
    <ArtistContext
      value={{
        artists,
        artistMap,
        memberMap,
        selected,
      }}
    >
      {children}
    </ArtistContext>
  );
}

/**
 * Provides a way to pull an artist and its contracts/members deep in the component tree.
 * Necessary due to:
 * - /bff/v1/collection-group not including the tokenAddress property.
 * - /bff/v1/collection-group using memberIds for filtering instead of member names.
 */
export function useArtists() {
  const ctx = use(ArtistContext);
  if (ctx === null) {
    throw new Error("useArtists must be used within an ArtistProvider");
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

  /**
   * Get the selected artists (or all if no selection)
   */
  const selected =
    ctx.selected.length > 0
      ? ctx.artists.filter((a) => ctx.selected.includes(a.id))
      : ctx.artists;

  return {
    artists: ctx.artists,
    getArtist,
    getMember,
    selected,
    selectedIds: ctx.selected,
  };
}
