import { useCallback } from "react";
import MemberFilter from "../collection/member-filter";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";

export default function CosmoMemberFilter() {
  const { filters, setFilters } = useCosmoFilters();

  const setActiveMember = useCallback(
    (member: string) => {
      setFilters((prev) => ({
        artist: undefined,
        member: prev.member === member ? undefined : member,
      }));
    },
    [setFilters],
  );

  const setActiveArtist = useCallback(
    (artist: string) => {
      setFilters((prev) => ({
        member: undefined,
        artist: prev.artist === artist ? undefined : (artist as ValidArtist),
      }));
    },
    [setFilters],
  );

  return (
    <MemberFilter
      active={filters.artist ?? filters.member}
      updateArtist={setActiveArtist}
      updateMember={setActiveMember}
    />
  );
}
