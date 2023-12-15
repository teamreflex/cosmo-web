"use client";

import { TransferResult } from "@/lib/universal/transfers";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Fragment, useEffect } from "react";
import { ChevronDown, HeartCrack, Loader2 } from "lucide-react";
import TransferRow from "./transfer-row";
import { cn } from "@/lib/utils";

type Props = {
  nickname: string;
  address: string;
};

export default function TransfersRenderer({ nickname, address }: Props) {
  const { ref, inView } = useInView();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["transfers", address],
      queryFn: async ({ pageParam = 0 }: { pageParam?: string | number }) => {
        const result = await fetch(
          `/api/transfers/${address}?page=${pageParam}`
        );
        return (await result.json()) as TransferResult;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextStartAfter,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60,
    });

  // infinite scroll loader
  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  return (
    <>
      <div className="flex flex-col rounded-lg border border-accent text-sm">
        <div
          className={cn(
            "items-center grid grid-cols-4 h-12 px-4 text-left align-middle font-medium text-muted-foreground",
            status === "pending" && "border-b border-accent"
          )}
        >
          <span>Objekt</span>
          <span>Action</span>
          <span>User</span>
          <span>Date</span>
        </div>

        <div className="flex flex-col">
          {status === "pending" ? (
            <div className="flex col-span-full justify-center py-4">
              <Loader2 className="animate-spin h-12 w-12" />
            </div>
          ) : status === "error" ? (
            <Error />
          ) : (
            <>
              {data !== undefined &&
                data.pages.map((group, i) => (
                  <Fragment key={i}>
                    {group.results.map((row) => (
                      <TransferRow
                        key={row.transfer.id}
                        row={row}
                        address={address}
                      />
                    ))}
                  </Fragment>
                ))}
            </>
          )}
        </div>
      </div>

      {status !== "error" && (
        <div className="flex justify-center py-6">
          <button
            ref={ref}
            onClick={() => fetchNextPage()}
            disabled={!hasNextPage || isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <Loading />
            ) : hasNextPage ? (
              <LoadMore />
            ) : (
              <></>
            )}
          </button>
        </div>
      )}
    </>
  );
}

function LoadMore() {
  return <ChevronDown className="animate-bounce h-12 w-12" />;
}

function Loading() {
  return <Loader2 className="animate-spin h-12 w-12" />;
}

function Error() {
  return (
    <div className="col-span-full flex flex-col gap-2 justify-center items-center py-12">
      <HeartCrack className="h-12 w-12" />
      <p>There was an error loading transfers</p>
    </div>
  );
}
