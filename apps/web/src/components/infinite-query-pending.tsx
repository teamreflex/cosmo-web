import { m } from "@/i18n/messages";
import {
  IconChevronDown,
  IconLoader2,
  IconPaw,
  IconRefresh,
} from "@tabler/icons-react";
import type { QueryStatus } from "@tanstack/react-query";
import { useOnInView } from "react-intersection-observer";
import { Button } from "./ui/button";

type Props = {
  status: QueryStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
};

export function InfiniteQueryNext({
  status,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  fetchNextPage,
}: Props) {
  const inViewRef = useOnInView((inView) => {
    if (inView) fetchNextPage();
  });
  // a failed page waits for a click, so scrolling doesn't retry it in a loop
  const failed = isFetchNextPageError && !isFetchingNextPage;

  return (
    <div className="flex justify-center py-6">
      {/* ready to fetch next page */}
      {status === "success" &&
        hasNextPage &&
        !isFetchingNextPage &&
        !failed && (
          <button
            ref={inViewRef}
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
          >
            <IconChevronDown className="h-12 w-12 animate-bounce" />
          </button>
        )}

      {/* fetching next page */}
      {isFetchingNextPage && <IconLoader2 className="h-12 w-12 animate-spin" />}

      {/* the next page failed, which leaves the query in error with its data kept */}
      {failed && (
        <Button variant="outline" onClick={fetchNextPage}>
          <IconRefresh /> {m.common_retry()}
        </Button>
      )}

      {/* no more pages */}
      {status === "success" && !hasNextPage && <IconPaw className="h-6 w-6" />}
    </div>
  );
}
