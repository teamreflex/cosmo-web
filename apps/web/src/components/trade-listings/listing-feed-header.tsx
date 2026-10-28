import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { listingFeedColumns } from "./listing-feed-columns";

export default function ListingFeedHeader() {
  return (
    <div
      aria-hidden
      className={cn(
        "sticky top-14 z-20 hidden gap-x-3.5 border-b bg-card/90 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-lg lg:grid",
        listingFeedColumns,
      )}
    >
      <span>{m.market_listings_column_type()}</span>
      <span>{m.market_listings_column_offering()}</span>
      <span />
      <span>{m.market_listings_column_asking()}</span>
      <span>{m.market_listings_column_from()}</span>
    </div>
  );
}
