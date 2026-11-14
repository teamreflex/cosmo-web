import { type FilterUpdate, resolveUpdate } from "@/lib/client/filters";
import type { transfersFrontendSchema } from "@/lib/universal/parsers";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { z } from "zod";

export function useTransferFilters() {
  const navigate = useNavigate({ from: "/@{$username}/trades" });
  const searchParams = useSearch({ from: "/@{$username}/trades" });

  /**
   * Sets multiple filters at once and commits to the URL.
   */
  const setFilters = (input: FilterUpdate<TransferFilters>) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...resolveUpdate(input, searchParams),
      }),
      replace: true,
    });
  };

  return {
    filters: searchParams,
    setFilters,
  };
}

export type TransferFilters = z.infer<typeof transfersFrontendSchema>;
