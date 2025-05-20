import type { QueryStatus } from "@tanstack/react-query";
import { ChevronDown, Loader2, PawPrint } from "lucide-react";
import { InView } from "react-intersection-observer";

type Props = {
  status: QueryStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

export function InfiniteQueryNext({
  status,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Props) {
  function onInView(inView: boolean) {
    if (inView) fetchNextPage();
  }

  return (
    <div className="flex justify-center py-6">
      {/* ready to fetch next page */}
      {status === "success" && hasNextPage && !isFetchingNextPage && (
        <InView
          as="button"
          onChange={onInView}
          onClick={fetchNextPage}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          <ChevronDown className="animate-bounce h-12 w-12" />
        </InView>
      )}

      {/* fetching next page */}
      {isFetchingNextPage && <Loader2 className="animate-spin h-12 w-12" />}

      {/* no more pages */}
      {status === "success" && !hasNextPage && <PawPrint className="h-6 w-6" />}
    </div>
  );
}
