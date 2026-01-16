import type { progressFrontendSchema } from "@/lib/universal/parsers";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import type { z } from "zod";

const route = getRouteApi("/@{$username}/progress");

export function useProgressFilters() {
  const navigate = route.useNavigate();
  const searchParams = route.useSearch();

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = useCallback(
    (
      input:
        | Partial<ProgressFilters>
        | ((prev: ProgressFilters) => Partial<ProgressFilters>),
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

  /**
   * Sets a single filter.
   */
  const setFilter = useCallback(
    (
      key: keyof ProgressFilters,
      value: ProgressFilters[keyof ProgressFilters],
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters],
  );

  return {
    filters: searchParams,
    setFilters,
    setFilter,
  };
}

export type ProgressFilters = z.infer<typeof progressFrontendSchema>;
export type SetProgressFilters = (
  input:
    | Partial<ProgressFilters>
    | ((prev: ProgressFilters) => Partial<ProgressFilters>),
) => void;
export type SetProgressFilter<TKey extends keyof ProgressFilters> = (
  key: TKey,
  value: ProgressFilters[TKey],
) => void;
