import { artistsQuery, selectedArtistsQuery } from "@/lib/queries/core";
import { useSuspenseQueries } from "@tanstack/react-query";

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
    return artists[artistName.toLowerCase()];
  }

  /**
   * Get a member by name
   */
  function getMember(memberName: string) {
    return members[memberName.toLowerCase()];
  }

  /**
   * Get artists in array form.
   */
  const artistList = Object.values(artists);

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
