import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import type z from "zod";
import { cosmoSchema } from "@/lib/universal/parsers";

export function useCosmoFilters() {
  const navigate = useNavigate();
  const searchParams = useSearch({
    strict: false,
  });

  /**
   * Parses the search params into a CosmoFilters object.
   */
  const filters = useMemo((): CosmoFilters => {
    const parsed = cosmoSchema.safeParse(searchParams);
    if (!parsed.success) {
      return defaultFilters;
    }
    return parsed.data;
  }, [searchParams]);

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = useCallback(
    (
      input:
        | Partial<CosmoFilters>
        | ((prev: CosmoFilters) => Partial<CosmoFilters>),
    ) => {
      if (typeof input === "function") {
        input = input(filters);
      }

      navigate({
        // @ts-ignore - TODO: fix
        search: (prev) => ({
          ...prev,
          ...input,
        }),
      });
    },
    [searchParams],
  );

  /**
   * Sets a single filter.
   */
  const setFilter = useCallback(
    (key: keyof CosmoFilters, value: CosmoFilters[keyof CosmoFilters]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters],
  );

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
} satisfies CosmoFilters;
