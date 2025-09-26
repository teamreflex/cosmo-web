import { useCallback } from "react";
import { getRouteApi } from "@tanstack/react-router";
import type z from "zod";
import type { transfersFrontendSchema } from "@/lib/universal/parsers";

const route = getRouteApi("/(profile)/@{$username}/trades");

export function useTransferFilters() {
  const navigate = route.useNavigate();
  const searchParams = route.useSearch();

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = useCallback(
    (
      input:
        | Partial<TransferFilters>
        | ((prev: TransferFilters) => Partial<TransferFilters>),
    ) => {
      if (typeof input === "function") {
        input = input(searchParams);
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
    (
      key: keyof TransferFilters,
      value: TransferFilters[keyof TransferFilters],
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

export type TransferFilters = z.infer<typeof transfersFrontendSchema>;
export type SetTransferFilters = (
  input:
    | Partial<TransferFilters>
    | ((prev: TransferFilters) => Partial<TransferFilters>),
) => void;
export type SetTransferFilter<TKey extends keyof TransferFilters> = (
  key: TKey,
  value: TransferFilters[TKey],
) => void;
