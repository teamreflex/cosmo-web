import { TransferResult } from "@/lib/universal/transfers";
import { baseUrl } from "@/lib/utils";
import { infiniteQueryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";

export const transfersQuery = (address: string) =>
  infiniteQueryOptions({
    queryKey: ["transfers", address],
    queryFn: async ({ pageParam = 0 }: { pageParam?: string | number }) => {
      const endpoint = new URL(`/api/transfers/${address}`, baseUrl());
      return await ofetch<TransferResult>(endpoint.toString(), {
        query: {
          page: pageParam.toString(),
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextStartAfter,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
  });
