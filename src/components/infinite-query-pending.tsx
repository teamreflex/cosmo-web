import { ChevronDown, Loader2, PawPrint } from "lucide-react";
import { useOnInView } from "react-intersection-observer";
import type { QueryStatus } from "@tanstack/react-query";

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
  const inViewRef = useOnInView((inView) => {
    if (inView) fetchNextPage();
  });

  return (
    <div className="flex justify-center py-6">
      {/* ready to fetch next page */}
      {status === "success" && hasNextPage && !isFetchingNextPage && (
        <button
          ref={inViewRef}
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
        >
          <ChevronDown className="h-12 w-12 animate-bounce" />
        </button>
      )}

      {/* fetching next page */}
      {isFetchingNextPage && <Loader2 className="h-12 w-12 animate-spin" />}

      {/* no more pages */}
      {status === "success" && !hasNextPage && <PawPrint className="h-6 w-6" />}
    </div>
  );
}
