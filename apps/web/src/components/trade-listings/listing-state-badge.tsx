import { m } from "@/i18n/messages";
import type { ListingState } from "@/lib/universal/trade-listings";
import { Badge } from "../ui/badge";
import { tones } from "./state-tones";

/**
 * Where a listing stands, the same for every viewer.
 */
export default function ListingStateBadge({
  status,
}: {
  status: ListingState["status"];
}) {
  switch (status) {
    case "open":
      return (
        <Badge variant="secondary">{m.listing_detail_status_open()}</Badge>
      );
    case "claimed":
      return <Badge>{m.listing_detail_status_claimed()}</Badge>;
    case "filled":
      return (
        <Badge className={tones.ok}>{m.listing_detail_status_filled()}</Badge>
      );
    case "withdrawn":
      return (
        <Badge className={tones.muted}>
          {m.listing_detail_status_withdrawn()}
        </Badge>
      );
    case "broken":
    case "timed_out":
      return (
        <Badge className={tones.warn}>{m.listing_detail_status_closed()}</Badge>
      );
    case "removed":
      return (
        <Badge className={tones.bad}>{m.listing_detail_status_removed()}</Badge>
      );
    default:
      return status satisfies never;
  }
}
