import { m } from "@/i18n/messages";
import { myListingsQuery } from "@/lib/queries/trade-listings";
import type { MyListingRow } from "@/lib/universal/trade-listings";
import { IconTags } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { InfiniteQueryNext } from "../infinite-query-pending";
import ListingFeedHeader from "../trade-listings/listing-feed-header";
import { ListingSlipRow } from "../trade-listings/listing-feed-row";
import NewListingButton from "../trade-listings/new-listing-button";
import { SlipItems, SlipList } from "../trade-listings/slip";
import { tones } from "../trade-listings/state-tones";
import { Badge } from "../ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";

/**
 * The viewer's open listings as the Listings feed shows them, a page at a
 * time, each ending with what waits on it. Each row opens its listing.
 */
export default function MyListings() {
  const query = useSuspenseInfiniteQuery(myListingsQuery());
  const rows = query.data.pages.flatMap((page) => page.rows);

  if (rows.length === 0) {
    return (
      <Empty className="rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconTags />
          </EmptyMedia>
          <EmptyTitle className="text-base">{m.my_listings_empty()}</EmptyTitle>
          <EmptyDescription>{m.my_listings_empty_body()}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <NewListingButton />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <SlipList>
        <ListingFeedHeader end={m.my_listings_column_activity()} />
        <SlipItems>
          {rows.map((row) => (
            <ListingSlipRow key={row.id} row={row}>
              <Activity row={row} />
            </ListingSlipRow>
          ))}
        </SlipItems>
      </SlipList>
      <InfiniteQueryNext
        status={query.status}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isFetchNextPageError={query.isFetchNextPageError}
        fetchNextPage={query.fetchNextPage}
      />
    </>
  );
}

// the pending offers waiting on the viewer's answer, then the trades under way
function Activity({ row }: { row: MyListingRow }) {
  if (row.offers === 0 && row.liveTrades === 0) {
    return (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {m.my_listings_no_activity()}
      </span>
    );
  }
  return (
    <>
      {row.offers > 0 && (
        <Badge className={tones.cosmo}>
          {m.my_listings_offers({ count: row.offers })}
        </Badge>
      )}
      {row.liveTrades > 0 && (
        <Badge className={tones.muted}>
          {m.my_listings_live_trades({ count: row.liveTrades })}
        </Badge>
      )}
    </>
  );
}
