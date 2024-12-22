import { QueryStatus } from "@tanstack/react-query";
import { LuChevronDown, LuPawPrint } from "react-icons/lu";
import { TbLoader2 } from "react-icons/tb";
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
          <LuChevronDown className="animate-bounce h-12 w-12" />
        </InView>
      )}

      {/* fetching next page */}
      {isFetchingNextPage && <TbLoader2 className="animate-spin h-12 w-12" />}

      {/* no more pages */}
      {status === "success" && !hasNextPage && (
        <LuPawPrint className="h-6 w-6" />
      )}
    </div>
  );
}
