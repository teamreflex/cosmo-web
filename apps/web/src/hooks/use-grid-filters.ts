import type { gridFrontendSchema } from "@/lib/universal/parsers";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import type { z } from "zod";

const route = getRouteApi("/@{$username}/grid");

export function useGridFilters() {
  const navigate = route.useNavigate();
  const searchParams = route.useSearch();

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = useCallback(
    (
      input:
        | Partial<GridFilters>
        | ((prev: GridFilters) => Partial<GridFilters>),
    ) => {
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
