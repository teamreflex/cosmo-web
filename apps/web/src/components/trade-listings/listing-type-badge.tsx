import { listingTypeLabels } from "@/lib/client/trade-listings";
import { cn } from "@/lib/utils";
import type { ListingType } from "@apollo/trades/listing";
import type { ReactNode } from "react";
import { Badge } from "../ui/badge";

const tones = {
  trade: "bg-teal-500/15 text-teal-700 dark:bg-teal-500/18 dark:text-teal-500",
  sell: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/18 dark:text-amber-500",
  buy: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/18 dark:text-sky-500",
} satisfies Record<ListingType, string>;

/**
 * One type a listing is (listingTypesOf()): a trade, a sale or a buy, in
 * the same colour on its feed row and its page. A listing whose options
 * make it several shows a badge for each. `children` replaces the type's
 * name, for a badge that names a party's side of that type instead.
 */
export default function ListingTypeBadge({
  type,
  className,
  children,
}: {
  type: ListingType;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Badge className={cn(tones[type], className)}>
      {children ?? listingTypeLabels[type]()}
    </Badge>
  );
}
