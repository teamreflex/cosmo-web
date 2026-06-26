import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { useCallback } from "react";
import MemberFilter from "../collection/member-filter";

export default function CosmoMemberFilter() {
  const { filters, setFilters } = useCosmoFilters();

  const setActiveMember = useCallback(
    (member: string) => {
      setFilters((prev) => {
        const current = prev.member ?? [];
        const next = current.includes(member)
          ? current.filter((m) => m !== member)
          : [...current, member];
        return {
          artist: undefined,
          member: next.length > 0 ? next : undefined,
        };
      });
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
      activeArtist={filters.artist ?? null}
      activeMembers={filters.member ?? []}
      multiple
      updateArtist={setActiveArtist}
      updateMember={setActiveMember}
    />
  );
}
