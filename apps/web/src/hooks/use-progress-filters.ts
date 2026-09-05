import type { progressFrontendSchema } from "@/lib/universal/parsers";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import type { z } from "zod";

export function useProgressFilters() {
  const navigate = useNavigate({ from: "/@{$username}/progress" });
  const searchParams = useSearch({ from: "/@{$username}/progress" });

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = useCallback(
    (
      input:
        | Partial<ProgressFilters>
        | ((prev: ProgressFilters) => Partial<ProgressFilters>),
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
