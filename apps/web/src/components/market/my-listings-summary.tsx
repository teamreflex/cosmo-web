import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useMyListingsQuery } from "@/hooks/use-my-listings";
import { m } from "@/i18n/messages";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Stat } from "../lists/sale-list-summary";
import { Skeleton } from "../ui/skeleton";

/**
 * Pricing overview across every sale list, whatever the filters.
 */
export default function MyListingsSummary() {
  const { data } = useSuspenseInfiniteQuery(useMyListingsQuery());
  const viewer = useDisplayCurrency();
  const summary = data.pages[0]?.summary;

  if (!summary || summary.serials === 0) return null;

  return (
    <div className="border-b border-border">
      <div className="container grid grid-cols-2 gap-x-8 gap-y-3 py-3.5 sm:flex sm:flex-wrap sm:items-center">
        <Stat label={m.list_sale_summary_priced()}>
          {m.list_sale_summary_priced_value({
            priced: summary.priced.toLocaleString(),
            total: summary.serials.toLocaleString(),
          })}
        </Stat>
        <Stat label={m.list_sale_summary_asking_total()}>
          {summary.priced === 0
            ? "—"
            : viewer.formatUsd(summary.askingTotalUsd)}
        </Stat>
        <Stat
          label={m.list_sale_summary_at_floor()}
          className="text-emerald-500 dark:text-emerald-300"
        >
          {summary.atFloor.toLocaleString()}
        </Stat>
        <Stat
          label={m.my_listings_status_undercut()}
          className="text-amber-500 dark:text-amber-300"
        >
          {summary.undercut.toLocaleString()}
        </Stat>
        <Stat label={m.my_listings_status_only_seller()}>
          {summary.onlySeller.toLocaleString()}
        </Stat>
      </div>
    </div>
  );
}

export function MyListingsSummarySkeleton() {
  return (
    <div className="border-b border-border">
      <div className="container grid grid-cols-2 gap-x-8 gap-y-3 py-3.5 sm:flex sm:flex-wrap sm:items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
