import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { useCallback, useMemo } from "react";

/**
 * Collection group fetching is done by member ID instead of name,
 * so we need to map member names to IDs, and pass the corresponding artist back.
 */
export function useCosmoMembers(artists: CosmoArtistWithMembersBFF[]) {
  /**
   * Merge all members into a single map.
   * TODO: This will break if there's duplicate member names.
   */
  const members = useMemo(() => {
    return new Map(
      artists.flatMap((artist) =>
        artist.artistMembers.map((member) => [
          member.name.toLowerCase(),
          member,
        ])
      )
    );
  }, [artists]);

  /**
   * Get a member by name
   */
  const getMember = useCallback(
    (memberName: string) => members.get(memberName.toLowerCase()),
    [members]
  );

  return { getMember };
}
