import { type FilterUpdate, resolveUpdate } from "@/lib/client/filters";
import type { progressFrontendSchema } from "@/lib/universal/parsers";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { z } from "zod";

export function useProgressFilters() {
  const navigate = useNavigate({ from: "/@{$username}/progress" });
  const searchParams = useSearch({ from: "/@{$username}/progress" });

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = (input: FilterUpdate<ProgressFilters>) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...resolveUpdate(input, searchParams),
      }),
      replace: true,
    });
  };

  /**
   * Sets a single filter.
   */
  const setFilter = (
    key: keyof ProgressFilters,
    value: ProgressFilters[keyof ProgressFilters],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return {
    filters: searchParams,
    setFilters,
    setFilter,
  };
}

export type ProgressFilters = z.infer<typeof progressFrontendSchema>;
