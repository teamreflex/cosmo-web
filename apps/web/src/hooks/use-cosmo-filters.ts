import { type FilterUpdate, resolveUpdate } from "@/lib/client/filters";
import { cosmoSchema } from "@/lib/universal/parsers";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { z } from "zod";

/**
 * Manages objekt-related filters.
 */
export function useCosmoFilters() {
  const navigate = useNavigate();
  /**
   * Parsing produces fresh arrays on every router update, so structural sharing
   * keeps the result referentially stable and consumers only re-render when a
   * filter actually changes.
   */
  const filters = useSearch({
    strict: false,
    structuralSharing: true,
    select: (search) => {
      const parsed = cosmoSchema.safeParse(search);
      if (!parsed.success) {
        return defaultFilters;
      }
      return parsed.data;
    },
  });

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = (input: FilterUpdate<CosmoFilters>) => {
    void navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        ...resolveUpdate(input, filters),
      }),
      replace: true,
    });
  };

  return {
    filters,
    setFilters,
  };
}

export type CosmoFilters = z.infer<typeof cosmoSchema>;
export type SetCosmoFilters = (input: FilterUpdate<CosmoFilters>) => void;

export type PropsWithFilters = {
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
};

export const defaultFilters = {
  sort: "newest",
  season: [],
  class: [],
  on_offline: [],
  member: undefined,
  artist: undefined,
  collectionNo: [],
  transferable: undefined,
} satisfies CosmoFilters;
