import { QueryStatus } from "@tanstack/react-query";
import { ChevronDown, Loader2, PawPrint } from "lucide-react";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

type Props = {
  status: QueryStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

export default function InfiniteQueryPending({
  status,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Props) {
  const { ref, inView } = useInView();

  // infinite scroll loader
  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  return (
    <div className="flex justify-center py-6">
      {/* ready to fetch next page */}
      {status === "success" && hasNextPage && !isFetchingNextPage && (
        <button
          ref={ref}
          onClick={fetchNextPage}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          <ChevronDown className="animate-bounce h-12 w-12" />
        </button>
      )}

      {/* fetching next page */}
      {isFetchingNextPage && <Loader2 className="animate-spin h-12 w-12" />}

      {/* no more pages */}
      {status === "success" && !hasNextPage && <PawPrint className="h-6 w-6" />}
    </div>
  );
}
