import { useProgressFilters } from "@/hooks/use-progress-filters";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { useCallback } from "react";
import MemberFilter from "../collection/member-filter";
import ProgressViewSwitch from "./progress-view-switch";

export default function ProgressToolbar() {
  const { filters, setFilters } = useProgressFilters();

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
        // SAFETY: callers pass artist ids from the artist list
        artist: prev.artist === artist ? undefined : (artist as ValidArtist),
      }));
    },
    [setFilters],
  );

  return (
    <>
      <ProgressViewSwitch
        view="progress"
        search={{ artist: filters.artist, member: filters.member }}
      />
      <MemberFilter
        align="end"
        activeArtist={filters.artist ?? null}
        activeMembers={filters.member ? [filters.member] : []}
        updateArtist={setActiveArtist}
        updateMember={setActiveMember}
      />
    </>
  );
}
