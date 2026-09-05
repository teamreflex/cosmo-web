import type { gridFrontendSchema } from "@/lib/universal/parsers";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import type { z } from "zod";

export function useGridFilters() {
  const navigate = useNavigate({ from: "/@{$username}/grid" });
  const searchParams = useSearch({ from: "/@{$username}/grid" });

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

  return {
    filters: searchParams,
    setFilters,
  };
}

export type GridFilters = z.infer<typeof gridFrontendSchema>;
