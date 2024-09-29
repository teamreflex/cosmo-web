"use client";

import { TransferResult } from "@/lib/universal/transfers";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Fragment } from "react";
import { HeartCrack, Loader2 } from "lucide-react";
import TransferRow from "./transfer-row";
import { cn } from "@/lib/utils";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { ofetch } from "ofetch";

type Props = {
  address: string;
};

export default function TransfersRenderer({ address }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["transfers", address],
      queryFn: async ({ pageParam = 0 }: { pageParam?: string | number }) => {
        return await ofetch<TransferResult>(`/api/transfers/${address}`, {
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

  const rows = data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <>
      <div className="flex flex-col rounded-lg border border-accent text-sm">
        <div
          className={cn(
            "items-center grid grid-cols-[3fr_2fr_2fr_2fr] gap-2 h-12 px-4 text-left align-middle font-medium text-muted-foreground",
            status === "pending" && "border-b border-accent"
          )}
        >
          <span>Objekt</span>
          <span>Action</span>
          <span>User</span>
          <span className="text-right">Date</span>
        </div>

        <div className="flex flex-col">
          {status === "pending" ? (
            <div className="flex col-span-full justify-center py-4">
              <Loader2 className="animate-spin h-12 w-12" />
            </div>
          ) : status === "error" ? (
            <Error />
          ) : (
            rows.map((row) => (
              <TransferRow key={row.transfer.id} row={row} address={address} />
            ))
          )}
        </div>
      </div>

      <InfiniteQueryNext
        status={status}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}

function Error() {
  return (
    <div className="col-span-full flex flex-col gap-2 justify-center items-center py-12">
      <HeartCrack className="h-12 w-12" />
      <p>There was an error loading transfers</p>
    </div>
  );
}
