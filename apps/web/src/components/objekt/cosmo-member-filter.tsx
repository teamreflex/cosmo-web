import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { type ComponentProps, useCallback } from "react";
import MemberFilter from "../collection/member-filter";

type Props = Pick<ComponentProps<typeof MemberFilter>, "align">;

export default function CosmoMemberFilter({ align }: Props) {
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
    (artist: ValidArtist) => {
      setFilters((prev) => ({
        member: undefined,
        artist: prev.artist === artist ? undefined : artist,
      }));
    },
    [setFilters],
  );

  return (
    <MemberFilter
      align={align}
      activeArtist={filters.artist ?? null}
      activeMembers={filters.member ?? []}
      multiple
      updateArtist={setActiveArtist}
      updateMember={setActiveMember}
    />
  );
}
