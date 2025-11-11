import { createContext, use, useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type {
  CosmoArtistWithMembersBFF,
  CosmoMemberBFF,
} from "@apollo/cosmo/types/artists";
import { selectedArtistsQuery } from "@/lib/queries/core";

type ContextProps = {
  // cosmo artist data
  artists: CosmoArtistWithMembersBFF[];
  artistMap: Map<string, CosmoArtistWithMembersBFF>;
  memberMap: Map<string, CosmoMemberBFF>;
};

const ArtistContext = createContext<ContextProps>({
  artists: [],
  artistMap: new Map(),
  memberMap: new Map(),
});

type ProviderProps = {
  children: ReactNode;
  artists: CosmoArtistWithMembersBFF[];
};

// static data that doesn't change
export function ArtistProvider({ children, artists }: ProviderProps) {
  const artistMap = new Map(
    artists.map((artist) => [artist.id.toLowerCase(), artist]),
  );

  const memberMap = new Map(
    artists.flatMap((artist) =>
      artist.artistMembers.map((member) => [member.name.toLowerCase(), member]),
    ),
  );

  return (
    <ArtistContext
      value={{
        artists,
        artistMap,
        memberMap,
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
  // should *always* exist, so no suspending
  const { data } = useSuspenseQuery(selectedArtistsQuery);

  /**
   * Get an artist by name
   */
  const getArtist = useCallback(
    (artistName: string) => ctx.artistMap.get(artistName.toLowerCase()),
    [ctx.artistMap],
  );

  /**
   * Get a member by name
   */
  const getMember = useCallback(
    (memberName: string) => ctx.memberMap.get(memberName.toLowerCase()),
    [ctx.memberMap],
  );

  /**
   * Get the selected artists (or all if no selection)
   */
  const selected =
    data.length > 0
      ? ctx.artists.filter((a) => data.includes(a.id))
      : ctx.artists;

  return {
    artists: ctx.artists,
    getArtist,
    getMember,
    selected,
    selectedIds: data,
  };
}
