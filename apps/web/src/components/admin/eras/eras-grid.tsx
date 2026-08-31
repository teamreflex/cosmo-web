import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import { m } from "@/i18n/messages";
import { adminErasInfiniteQuery } from "@/lib/queries/events";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import EraCard from "./era-card";

export default function ErasGrid() {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(adminErasInfiniteQuery());

  const erasList = data.pages.flatMap((page) => page.eras);

  if (erasList.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {m.admin_no_eras()}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {erasList.map((era) => (
          <EraCard key={era.id} era={era} />
        ))}
      </div>

      <InfiniteQueryNext
        status="success"
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
}
