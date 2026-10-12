import { m } from "@/i18n/messages";
import type { ListingState } from "@/lib/universal/trade-listings";
import { Badge } from "../ui/badge";

const tones = {
  ok: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  muted: "border-transparent bg-secondary text-muted-foreground",
  warn: "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
  bad: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
} as const;

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
    case "abandoned":
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
