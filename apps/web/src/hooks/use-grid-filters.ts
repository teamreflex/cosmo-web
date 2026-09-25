import { useArtists } from "@/hooks/use-artists";
import type { gridFrontendSchema } from "@/lib/universal/parsers";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import type { z } from "zod";

export function useGridFilters() {
  const navigate = useNavigate({ from: "/@{$username}/grid" });
  const searchParams = useSearch({ from: "/@{$username}/grid" });
  const { getArtistForMember } = useArtists();

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = useCallback(
    (
      input:
        | Partial<GridFilters>
        | ((prev: GridFilters) => Partial<GridFilters>),
    ) => {
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- narrowing the updater-function union, standard setState pattern
      if (typeof input === "function") {
        input = input(searchParams);
      }

      void navigate({
        search: (prev) => ({
          ...prev,
          ...input,
        }),
        replace: true,
      });
    },
    [navigate, searchParams],
  );

  /**
   * Shared by the member filter and the ledger's member links.
   */
  const setActiveMember = useCallback(
    (member: string) => {
      setFilters((prev) => ({
        // deselecting a member falls back to their artist's overview
        artist: prev.member === member ? getArtistForMember(member) : undefined,
        member: prev.member === member ? undefined : member,
      }));
    },
    [setFilters, getArtistForMember],
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

  return {
    filters: searchParams,
    setFilters,
    setActiveMember,
    setActiveArtist,
  };
}

export type GridFilters = z.infer<typeof gridFrontendSchema>;
