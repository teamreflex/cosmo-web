import { useSuspenseQueries } from "@tanstack/react-query";
import { artistsQuery, selectedArtistsQuery } from "@/lib/queries/core";

/**
 * Provides a way to pull an artist and its contracts/members deep in the component tree.
 */
export function useArtists() {
  // should *always* exist, so no suspending
  const [
    {
      data: { artists, members },
    },
    { data: selectedIds },
  ] = useSuspenseQueries({
    queries: [artistsQuery, selectedArtistsQuery],
  });

  /**
   * Get an artist by name
   */
  function getArtist(artistName: string) {
    return artists.get(artistName.toLowerCase());
  }

  /**
   * Get a member by name
   */
  function getMember(memberName: string) {
    return members.get(memberName.toLowerCase());
  }

  /**
   * Get artists in array form.
   */
  const artistList = Array.from(artists.values());

  /**
   * Get the selected artists (or all if no selection)
   */
  const selected =
    selectedIds.length > 0
      ? artistList.filter((a) => selectedIds.includes(a.id))
      : artistList;

  return {
    artists,
    artistList,
    getArtist,
    getMember,
    selected,
    selectedIds,
  };
}
