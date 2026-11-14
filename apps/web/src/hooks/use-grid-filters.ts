import { useArtists } from "@/hooks/use-artists";
import { type FilterUpdate, resolveUpdate } from "@/lib/client/filters";
import type { gridFrontendSchema } from "@/lib/universal/parsers";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { z } from "zod";

export function useGridFilters() {
  const navigate = useNavigate({ from: "/@{$username}/grid" });
  const searchParams = useSearch({ from: "/@{$username}/grid" });
  const { getArtistForMember } = useArtists();

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = (input: FilterUpdate<GridFilters>) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...resolveUpdate(input, searchParams),
      }),
      replace: true,
    });
  };

  /**
   * Shared by the member filter and the ledger's member links.
   */
  const setActiveMember = (member: string) => {
    setFilters((prev) => ({
      // deselecting a member falls back to their artist's overview
      artist: prev.member === member ? getArtistForMember(member) : undefined,
      member: prev.member === member ? undefined : member,
    }));
  };

  const setActiveArtist = (artist: ValidArtist) => {
    setFilters((prev) => ({
      member: undefined,
      artist: prev.artist === artist ? undefined : artist,
    }));
  };

  return {
    filters: searchParams,
    setFilters,
    setActiveMember,
    setActiveArtist,
  };
}

export type GridFilters = z.infer<typeof gridFrontendSchema>;
