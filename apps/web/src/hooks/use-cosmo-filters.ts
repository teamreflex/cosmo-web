import { useNavigate, useSearch } from "@tanstack/react-router";
import type z from "zod";
import { cosmoSchema } from "@/lib/universal/parsers";

/**
 * Manages objekt-related filters.
 */
export function useCosmoFilters() {
  const navigate = useNavigate();
  const filters = useSearch({
    strict: false,
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
  const setFilters = (
    input:
      | Partial<CosmoFilters>
      | ((prev: CosmoFilters) => Partial<CosmoFilters>),
  ) => {
    if (typeof input === "function") {
      input = input(filters);
    }

    navigate({
      // @ts-ignore - this hook is used on different routes so we can't reliably type this
      search: (prev) => ({
        ...prev,
        ...input,
      }),
      replace: true,
    });
  };

  /**
   * Sets a single filter.
   */
  const setFilter = (
    key: keyof CosmoFilters,
    value: CosmoFilters[keyof CosmoFilters],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return {
    filters,
    setFilters,
    setFilter,
  };
}

export type CosmoFilters = z.infer<typeof cosmoSchema>;
export type SetCosmoFilters = (
  input:
    | Partial<CosmoFilters>
    | ((prev: CosmoFilters) => Partial<CosmoFilters>),
) => void;
export type SetCosmoFilter<TKey extends keyof CosmoFilters> = (
  key: TKey,
  value: CosmoFilters[TKey],
) => void;

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
