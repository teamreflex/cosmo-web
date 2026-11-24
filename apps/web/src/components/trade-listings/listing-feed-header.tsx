import { m } from "@/i18n/messages";
import { SlipColumnHeader } from "./slip";

/**
 * The lg column headings over listing slips. `end` heads the last column:
 * the poster in the feed, what waits on the viewer's own listings on My
 * trades.
 */
export default function ListingFeedHeader({
  end = m.market_listings_column_from(),
}: {
  end?: string;
}) {
  return (
    <SlipColumnHeader variant="listing">
      <span>{m.market_listings_column_type()}</span>
      <span>{m.market_listings_column_offering()}</span>
      <span />
      <span>{m.market_listings_column_asking()}</span>
      <span>{end}</span>
    </SlipColumnHeader>
  );
}
