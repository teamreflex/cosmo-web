import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import type z from "zod";
import { cosmoSchema } from "@/lib/universal/parsers";

export function useCosmoFilters() {
  const navigate = useNavigate();
  const searchParams = useSearch({
    strict: false,
  });

  const filters = useMemo((): CosmoFilters => {
    const parsed = cosmoSchema.safeParse(searchParams);
    if (!parsed.success) {
      return defaultFilters;
    }
    return parsed.data;
  }, [searchParams]);

  const setFilters = useCallback(
    (input: Partial<CosmoFilters>) => {
      navigate({
        search: (prev) => ({
          ...prev,
          ...input,
        }),
      });
    },
    [searchParams]
  );

  return [filters, setFilters] as const;
}

export type CosmoFilters = z.infer<typeof cosmoSchema>;
export type SetCosmoFilters = (filters: CosmoFilters) => void;
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
